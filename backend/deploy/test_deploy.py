"""Exercise deployment control flow with fake Git, Docker, SSH state and HTTP."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


SCRIPTS = Path(__file__).resolve().parent
SHA = "a" * 40


class DeployTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / "repo"
        self.deploy = self.repo / "backend/deploy"
        self.deploy.mkdir(parents=True)
        for name in ("update.sh", "github-ssh.sh", "install-github-deploy.sh"):
            shutil.copy(SCRIPTS / name, self.deploy / name)
        (self.repo / "backend/.env").write_text("PRIVATE_TEST_VALUE=must-not-be-printed\n")
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.log = self.root / "commands"
        self.home = self.root / "home"
        state = self.home / ".local/share/services-portfolio"
        state.mkdir(parents=True)
        (state / "repo-path").write_text(str(self.repo) + "\n")
        self.env = {**os.environ, "HOME": str(self.home), "PATH": str(self.bin) + os.pathsep + os.environ["PATH"],
                    "DEPLOY_TEST_LOG": str(self.log), "SSH_ORIGINAL_COMMAND": "deploy " + SHA}
        self.fake("git", '''
if [[ "$1" == -C ]]; then shift 2; fi
printf 'git %s\n' "$*" >> "$DEPLOY_TEST_LOG"
case "$*" in
  'branch --show-current') echo "${TEST_BRANCH:-main}" ;;
  'diff --quiet'|'diff --cached --quiet') exit "${TEST_DIRTY:-0}" ;;
  'rev-parse origin/main') echo "${TEST_MAIN_SHA:-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa}" ;;
  'rev-parse HEAD') echo "${TEST_HEAD_SHA:-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa}" ;;
esac
''')
        self.fake("docker", '''
printf 'docker %s\n' "$*" >> "$DEPLOY_TEST_LOG"
if [[ "$1 ${2:-}" == 'compose up' ]]; then exit "${TEST_BUILD_FAIL:-0}"; fi
''')
        self.fake("curl", 'printf "curl %s\\n" "$*" >> "$DEPLOY_TEST_LOG"; exit "${TEST_HTTP_FAIL:-0}"')
        self.fake("flock", 'exit 0')

    def fake(self, name, body):
        target = self.bin / name
        target.write_text("#!/usr/bin/env bash\nset -euo pipefail\n" + body + "\n")
        target.chmod(0o700)

    def run_script(self, name, *args, **changes):
        return subprocess.run(["bash", str(self.deploy / name), *args], env={**self.env, **changes}, text=True, capture_output=True)

    def commands(self):
        return self.log.read_text() if self.log.exists() else ""

    def test_update_targets_only_api_and_checks_public_health(self):
        result = self.run_script("update.sh")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("compose up -d --build --no-deps --wait --wait-timeout 180 api", self.commands())
        self.assertIn("https://api.daveclintonn.cc/healthz", self.commands())
        self.assertIn("compose logs --since 5m --tail 50 api", self.commands())
        self.assertNotIn("compose down", self.commands())
        self.assertNotIn("must-not-be-printed", result.stdout + result.stderr)

    def test_build_or_public_health_failure_remains_a_failure_and_prints_logs(self):
        for failure in ("TEST_BUILD_FAIL", "TEST_HTTP_FAIL"):
            with self.subTest(failure=failure):
                result = self.run_script("update.sh", **{failure: "7"})
                self.assertEqual(result.returncode, 7)
                self.assertIn("compose logs --since 5m --tail 50 api", self.commands())
                self.assertNotIn("API deployment is healthy", result.stdout)

    def test_forced_command_rejects_shells_and_injected_commands(self):
        for command in ("bash", "deploy main", "deploy " + SHA + "; echo injected", "deploy " + SHA + "\nwhoami"):
            with self.subTest(command=command):
                self.assertEqual(self.run_script("github-ssh.sh", SSH_ORIGINAL_COMMAND=command).returncode, 64)
        self.assertEqual(self.commands(), "")

    def test_superseded_commit_does_not_update_or_deploy(self):
        result = self.run_script("github-ssh.sh", TEST_MAIN_SHA="b" * 40)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Skipping superseded commit", result.stdout)
        self.assertNotIn("git merge", self.commands())
        self.assertNotIn("compose up", self.commands())

    def test_dirty_wrong_branch_or_ahead_checkout_is_not_deployed(self):
        for changes in ({"TEST_DIRTY": "1"}, {"TEST_BRANCH": "work-in-progress"}, {"TEST_HEAD_SHA": "b" * 40}):
            with self.subTest(changes=changes):
                result = self.run_script("github-ssh.sh", **changes)
                self.assertNotEqual(result.returncode, 0)
                self.assertNotIn("compose up", self.commands())

    def test_current_main_commit_is_fast_forwarded_and_deployed(self):
        result = self.run_script("github-ssh.sh")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("git fetch origin main", self.commands())
        self.assertIn("git merge --ff-only origin/main", self.commands())
        self.assertIn("compose up", self.commands())

    def test_install_preserves_other_keys_and_is_repeatable(self):
        ssh = self.home / ".ssh"
        ssh.mkdir()
        authorized = ssh / "authorized_keys"
        authorized.write_text("existing-administrator-key\n")
        key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITestKey github-actions-test"
        for _ in range(2):
            result = self.run_script("install-github-deploy.sh", key)
            self.assertEqual(result.returncode, 0, result.stderr)
        entries = authorized.read_text()
        self.assertIn("existing-administrator-key", entries)
        self.assertEqual(entries.count(key), 1)
        self.assertIn('restrict,command="', entries)
        self.assertEqual(authorized.stat().st_mode & 0o777, 0o600)
        self.assertEqual((self.home / ".local/bin/services-portfolio-deploy").stat().st_mode & 0o777, 0o700)


if __name__ == "__main__":
    unittest.main()

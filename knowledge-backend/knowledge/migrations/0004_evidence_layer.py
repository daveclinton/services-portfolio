"""Phase 4 evidence layer.

Adds ``evidence_type``, ``title``, ``description``, ``verified_at`` and
``external_id`` to ``Evidence`` so every claim is traceable to a typed
source. All new columns have database-level defaults (or accept NULL),
so existing Phase 2 rows survive the migration untouched; a data
migration then backfills ``title`` from the claim text where it is blank.

Fully reversible: the backfill is a no-op on reverse, and reversing the
AddField operations drops the columns.
"""

from django.db import migrations, models


def backfill_title_from_claim(apps, schema_editor):
    Evidence = apps.get_model("knowledge", "Evidence")
    for obj in Evidence.objects.filter(title=""):
        obj.title = obj.claim[:200]
        obj.save(update_fields=["title"])


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0003_person_slug_and_evidence_slug'),
    ]

    operations = [
        migrations.AddField(
            model_name='evidence',
            name='description',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='evidence',
            name='evidence_type',
            field=models.CharField(choices=[('project', 'Project'), ('repository', 'Repository'), ('article', 'Article'), ('talk', 'Talk'), ('documentation', 'Documentation'), ('certificate', 'Certificate'), ('metric', 'Metric'), ('screenshot', 'Screenshot')], default='documentation', max_length=20),
        ),
        migrations.AddField(
            model_name='evidence',
            name='external_id',
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name='evidence',
            name='title',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='evidence',
            name='verified_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_title_from_claim, migrations.RunPython.noop),
    ]

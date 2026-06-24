import NProgress from 'nprogress'

let isConfigured = false

function ensureProgressConfigured() {
  if (isConfigured) {
    return
  }

  NProgress.configure({
    minimum: 0.12,
    showSpinner: false,
    trickleSpeed: 140,
  })
  isConfigured = true
}

export async function withAssetProgress<T>(work: () => T | Promise<T>) {
  ensureProgressConfigured()
  NProgress.start()

  try {
    return await work()
  } finally {
    NProgress.done()
  }
}

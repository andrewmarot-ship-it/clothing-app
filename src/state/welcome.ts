const WELCOMED_KEY = 'clothesline-welcomed-v1'

/**
 * Show the welcome on a device's first launch only. Opening a sign-in link
 * also skips it: Supabase's implicit flow lands with the session in the hash.
 */
export function shouldWelcome(): boolean {
  try {
    if (localStorage.getItem(WELCOMED_KEY)) return false
  } catch {
    // Storage blocked: show it, it's only a greeting.
  }
  return !/access_token=|error_description=/.test(window.location.hash)
}

export function markWelcomed() {
  try {
    localStorage.setItem(WELCOMED_KEY, '1')
  } catch {
    // Worst case the welcome shows again next launch.
  }
}

/**
 * Trailblazer Section 2: Authentication
 * Supabase Auth with Google OAuth provider
 */

// Prevent duplicate redirects per page load
let authCallbackExecuted = false;

// Initialize Supabase client (global, so event handlers can access it)
// Uses credentials from window.AppConstants (lib/constants.js)
window.supabaseClient = window.supabaseClient || window.supabase.createClient(
  window.AppConstants.SUPABASE_URL,
  window.AppConstants.SUPABASE_ANON_KEY
);

const signinBtn = document.getElementById('signinBtn');
const btnText = document.getElementById('btnText');
const spinner = document.getElementById('spinner');
const errorBox = document.getElementById('errorBox');
const fullscreenSpinner = document.getElementById('fullscreenSpinner');

// Show error message
function showError(msg) {
  if (!errorBox) return;
  errorBox.textContent = msg;
  errorBox.style.display = 'block';
}

// Hide error message
function hideError() {
  if (!errorBox) return;
  errorBox.style.display = 'none';
}

// Set button state: idle, loading, disabled
function setButtonState(state) {
  if (!signinBtn || !btnText || !spinner) return;
  if (state === 'idle') {
    signinBtn.disabled = false;
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
    btnText.textContent = 'Continue with Google';
  } else if (state === 'loading') {
    signinBtn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'inline-block';
  }
}

// Show/hide fullscreen spinner
function setFullscreenSpinner(show) {
  if (!fullscreenSpinner) return;
  fullscreenSpinner.style.display = show ? 'flex' : 'none';
}

// Sign in with Google
async function signInWithGoogle() {
  hideError();
  setButtonState('loading');

  try {
    const { error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/section-2-auth.html'
      }
    });

    if (error) {
      throw error;
    }

    // Note: browser will redirect to Google login, then back to this page
  } catch (err) {
    setButtonState('idle');
    showError(err.message || 'Sign-in failed. Please try again.');
  }
}

// Handle sign-in callback from Google redirect
async function handleAuthCallback() {
  if (authCallbackExecuted) return;
  authCallbackExecuted = true;

  setFullscreenSpinner(true);

  try {
    // Get current session (should be set by Supabase after OAuth redirect)
    const { data: { session }, error: sessionError } = await window.supabaseClient.auth.getSession();

    if (sessionError) throw sessionError;

    if (!session || !session.user) {
      // No session yet; show sign-in screen
      setFullscreenSpinner(false);
      setButtonState('idle');
      return;
    }

    // User is signed in; check if profile exists
    const { data: profile, error: profileError } = await window.supabaseClient
      .from('profiles')
      .select('id, home_lat, home_label')
      .eq('id', session.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = no rows found (expected on first sign-in)
      throw profileError;
    }

    if (!profile) {
      // First time signing in: create profile
      const insertResult = await window.supabaseClient
        .from('profiles')
        .insert({
          id: session.user.id,
          display_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Runner',
          level: 1
        });

      const { error: createError, data: createData } = insertResult;
      if (createError) {
        throw createError;
      }

      if (window.location.pathname !== '/area-setup.html') {
        window.location.href = '/area-setup.html';
      }
    } else if (profile.home_lat && profile.home_label) {
      // Profile exists with home area; go to home-map only from entry points
      const isEntryPoint = ['/', '/index.html', '/area-setup.html'].includes(window.location.pathname);
      if (isEntryPoint && window.location.pathname !== '/home-map.html') {
        window.location.href = '/home-map.html';
      }
      // Otherwise, stay on current page
    } else {
      // Profile exists but no home area; go to area setup
      if (window.location.pathname !== '/area-setup.html') {
        window.location.href = '/area-setup.html';
      }
    }
  } catch (err) {
    setFullscreenSpinner(false);
    setButtonState('idle');
    showError(err.message || 'Something went wrong. Please try again.');
    console.error(err);
  }
}

// Listen for auth state changes
window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN') {
    // Genuine sign-in (not initial session load)
    await handleAuthCallback();
  } else if (event === 'SIGNED_OUT') {
    // User signed out; show sign-in screen
    setFullscreenSpinner(false);
    setButtonState('idle');
    hideError();
  }
});

// Button click handler
if (signinBtn) {
  signinBtn.addEventListener('click', signInWithGoogle);
}

// On page load, check if already signed in (session persists)
async function initAuth() {
  const { data: { session } } = await window.supabaseClient.auth.getSession();

  if (session) {
    // Already signed in; handle callback to route to correct screen
    setFullscreenSpinner(true);
    await handleAuthCallback();
  } else {
    // Not signed in; show sign-in screen
    setButtonState('idle');
  }
}

initAuth();

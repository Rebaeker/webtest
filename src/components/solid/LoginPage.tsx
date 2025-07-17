import { createSignal, createEffect } from 'solid-js';

export default function LoginPage() {
  const [activeTab, setActiveTab] = createSignal<'login' | 'signup'>('login');
  const [loading, setLoading] = createSignal(false);
  const [message, setMessage] = createSignal('');
  const [messageType, setMessageType] = createSignal<'success' | 'error'>('success');

  // Login form signals
  const [loginEmail, setLoginEmail] = createSignal('');
  const [loginPassword, setLoginPassword] = createSignal('');

  // Signup form signals
  const [signupPrename, setSignupPrename] = createSignal('');
  const [signupSurname, setSignupSurname] = createSignal('');
  const [signupEmail, setSignupEmail] = createSignal('');
  const [signupPhone, setSignupPhone] = createSignal('');
  const [signupPassword, setSignupPassword] = createSignal('');

  const handleTabSwitch = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    setMessage(''); // Clear any existing messages
  };

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const data = {
      action: 'login',
      email: loginEmail(),
      password: loginPassword()
    };

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success === 'ok') {
        showMessage(result.message, 'success');
        // Store user info in localStorage for frontend access
        localStorage.setItem('user', JSON.stringify(result.user));
        // Redirect to items page or previous page
        setTimeout(() => {
          window.location.href = '/items/';
        }, 1000);
      } else {
        showMessage(result.message, 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showMessage('Verbindungsfehler. Bitte versuchen Sie es erneut.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const data = {
      action: 'signup',
      email: signupEmail(),
      password: signupPassword(),
      prename: signupPrename(),
      surname: signupSurname(),
      phone: signupPhone()
    };

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success === 'ok') {
        showMessage(result.message, 'success');
        // Store user info in localStorage for frontend access
        localStorage.setItem('user', JSON.stringify(result.user));
        // Redirect to items page or previous page
        setTimeout(() => {
          window.location.href = '/items/';
        }, 1000);
      } else {
        showMessage(result.message, 'error');
      }
    } catch (error) {
      console.error('Signup error:', error);
      showMessage('Verbindungsfehler. Bitte versuchen Sie es erneut.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
    
    setTimeout(() => {
      setMessage('');
    }, 5000);
  };

  return (
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Anmelden oder Registrieren
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Melden Sie sich an, um Gegenstände zu melden oder Details zu sehen
          </p>
        </div>

        {/* Login/Signup Toggle */}
        <div class="flex rounded-lg bg-gray-100 p-1">
          <button 
            onClick={() => handleTabSwitch('login')}
            class={`flex-1 rounded-md py-2 px-4 text-sm font-medium transition-all ${
              activeTab() === 'login' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Anmelden
          </button>
          <button 
            onClick={() => handleTabSwitch('signup')}
            class={`flex-1 rounded-md py-2 px-4 text-sm font-medium transition-all ${
              activeTab() === 'signup' 
                ? 'bg-white text-green-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Registrieren
          </button>
        </div>

        {/* Login Form */}
        {activeTab() === 'login' && (
          <form onSubmit={handleLogin} class="mt-8 space-y-6">
            <div class="space-y-4">
              <div>
                <label for="loginEmail" class="block text-sm font-medium text-gray-700">
                  E-Mail-Adresse
                </label>
                <input 
                  id="loginEmail"
                  type="email" 
                  required 
                  value={loginEmail()}
                  onInput={(e) => setLoginEmail(e.currentTarget.value)}
                  class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" 
                  placeholder="ihre@email.com"
                />
              </div>
              <div>
                <label for="loginPassword" class="block text-sm font-medium text-gray-700">
                  Passwort
                </label>
                <input 
                  id="loginPassword"
                  type="password" 
                  required 
                  value={loginPassword()}
                  onInput={(e) => setLoginPassword(e.currentTarget.value)}
                  class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" 
                  placeholder="Passwort"
                />
              </div>
            </div>

            <div>
              <button 
                type="submit" 
                disabled={loading()}
                class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading() ? 'Anmelden...' : 'Anmelden'}
              </button>
            </div>
          </form>
        )}

        {/* Signup Form */}
        {activeTab() === 'signup' && (
          <form onSubmit={handleSignup} class="mt-8 space-y-6">
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="signupPrename" class="block text-sm font-medium text-gray-700">
                    Vorname
                  </label>
                  <input 
                    id="signupPrename"
                    type="text" 
                    required 
                    value={signupPrename()}
                    onInput={(e) => setSignupPrename(e.currentTarget.value)}
                    class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" 
                    placeholder="Max"
                  />
                </div>
                <div>
                  <label for="signupSurname" class="block text-sm font-medium text-gray-700">
                    Nachname
                  </label>
                  <input 
                    id="signupSurname"
                    type="text" 
                    required 
                    value={signupSurname()}
                    onInput={(e) => setSignupSurname(e.currentTarget.value)}
                    class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" 
                    placeholder="Mustermann"
                  />
                </div>
              </div>
              <div>
                <label for="signupEmail" class="block text-sm font-medium text-gray-700">
                  E-Mail-Adresse
                </label>
                <input 
                  id="signupEmail"
                  type="email" 
                  required 
                  value={signupEmail()}
                  onInput={(e) => setSignupEmail(e.currentTarget.value)}
                  class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" 
                  placeholder="max@example.com"
                />
              </div>
              <div>
                <label for="signupPhone" class="block text-sm font-medium text-gray-700">
                  Telefonnummer
                </label>
                <input 
                  id="signupPhone"
                  type="tel" 
                  required 
                  value={signupPhone()}
                  onInput={(e) => setSignupPhone(e.currentTarget.value)}
                  class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" 
                  placeholder="+49 123 456789"
                />
              </div>
              <div>
                <label for="signupPassword" class="block text-sm font-medium text-gray-700">
                  Passwort
                </label>
                <input 
                  id="signupPassword"
                  type="password" 
                  required 
                  minLength={6}
                  value={signupPassword()}
                  onInput={(e) => setSignupPassword(e.currentTarget.value)}
                  class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" 
                  placeholder="Mindestens 6 Zeichen"
                />
              </div>
            </div>

            <div>
              <button 
                type="submit" 
                disabled={loading()}
                class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading() ? 'Registrieren...' : 'Registrieren'}
              </button>
            </div>
          </form>
        )}

        {/* Message Area */}
        {message() && (
          <div class="text-center">
            <p class={`text-sm ${messageType() === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
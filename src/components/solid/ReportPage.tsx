import { createSignal, onMount, For } from 'solid-js';

interface Category {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  prename: string;
  surname: string;
}

export default function ReportPage() {
  const [isLoggedIn, setIsLoggedIn] = createSignal(false);
  const [user, setUser] = createSignal<User | null>(null);
  const [categories, setCategories] = createSignal<Category[]>([]);
  const [locations, setLocations] = createSignal<Location[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [message, setMessage] = createSignal('');
  const [messageType, setMessageType] = createSignal<'success' | 'error' | 'info'>('info');

  // Form signals
  const [itemType, setItemType] = createSignal<'isLost' | 'isFound' | ''>('');
  const [itemName, setItemName] = createSignal('');
  const [selectedCategory, setSelectedCategory] = createSignal('');
  const [selectedLocation, setSelectedLocation] = createSignal('');
  const [selectedDate, setSelectedDate] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [imageFile, setImageFile] = createSignal<File | null>(null);
  const [imagePreview, setImagePreview] = createSignal('');

  let fileInputRef: HTMLInputElement;

  onMount(() => {
    checkLoginStatus();
    // Lade Kategorien und Standorte aus der Datenbank
    loadCategories();
    loadLocations();
  });

  // Überprüfe den Anmeldestatus beim Laden der Seite
  const checkLoginStatus = () => {
    const localUser = localStorage.getItem('user');
    if (localUser) {
      const userData = JSON.parse(localUser);
      setUser(userData);
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  };

  // Datenbankabfrage für Kategorien - wird auf dem Client ausgeführt
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categorydb');
      const result = await response.json();
      
      if (result.success === 'ok') {
        setCategories(result.categories);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kategorien:', error);
    }
  };

  // Datenbankabfrage für Standorte - wird auf dem Client ausgeführt
  const loadLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      const result = await response.json();
      
      if (result.success === 'ok') {
        setLocations(result.locations);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Standorte:', error);
    }
  };

  // Bildvorschau-Funktionalität
  const handleImageChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      // Dateigröße überprüfen (maximal 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Datei ist zu groß. Maximale Größe: 5MB');
        target.value = '';
        return;
      }

      // Dateityp überprüfen
      if (!file.type.startsWith('image/')) {
        alert('Bitte wählen Sie eine gültige Bilddatei.');
        target.value = '';
        return;
      }

      setImageFile(file);
      
      // Bildvorschau erstellen
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview('');
    }
  };

  // Bild entfernen
  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef) {
      fileInputRef.value = '';
    }
  };

  // Nachricht anzeigen
  const showMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setMessage(text);
    setMessageType(type);
    
    // Nachricht nach 5 Sekunden ausblenden (außer bei Erfolg)
    if (type !== 'success') {
      setTimeout(() => {
        setMessage('');
      }, 5000);
    }
  };

  // Formular absenden
  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    
    // Überprüfe, ob der Benutzer noch angemeldet ist
    const currentUser = localStorage.getItem('user');
    if (!currentUser) {
      alert('Sie müssen sich anmelden, um Gegenstände zu melden.');
      window.location.href = '/login/';
      return;
    }

    setLoading(true);
    showMessage('Übertrage Daten...', 'info');

    // FormData für Datei-Upload verwenden
    const formData = new FormData();
    formData.append('type', itemType());
    formData.append('name', itemName());
    formData.append('category', selectedCategory());
    formData.append('location', selectedLocation());
    formData.append('date', selectedDate());
    formData.append('description', description());
    
    if (imageFile()) {
      formData.append('img', imageFile()!);
    }

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response result:', result);

      if (response.ok && result.success === 'ok') {
        showMessage('Gegenstand erfolgreich gemeldet!', 'success');
        // Formular zurücksetzen
        resetForm();
      } else {
        showMessage('Fehler beim Melden des Gegenstands: ' + (result.message || 'Unbekannter Fehler'), 'error');
      }
    } catch (error) {
      console.error('Fetch-Fehler:', error);
      showMessage('Netzwerkfehler oder Server nicht erreichbar.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Formular zurücksetzen
  const resetForm = () => {
    setItemType('');
    setItemName('');
    setSelectedCategory('');
    setSelectedLocation('');
    setSelectedDate('');
    setDescription('');
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef) {
      fileInputRef.value = '';
    }
  };

  return (
    <div class="mx-auto max-w-screen-lg px-4 py-8">
      {!isLoggedIn() ? (
        // Anmeldung erforderlich Nachricht
        <div class="text-center">
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 class="text-2xl font-bold text-yellow-800 mb-4">Anmeldung erforderlich</h2>
            <p class="text-yellow-700 mb-4">Sie müssen sich anmelden, um Gegenstände zu melden.</p>
            <a href="/login/" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Zur Anmeldung
            </a>
          </div>
        </div>
      ) : (
        // Formular für Gegenstände melden (nur angezeigt wenn angemeldet)
        <div>
          <h1 class="text-3xl font-bold text-gray-800 mb-6 text-center">
            Melden Sie einen verlorenen oder gefundenen Gegenstand.
          </h1>
          
          {/* Benutzer-Info Anzeige */}
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p class="text-blue-800">
              <strong>Gemeldet von:</strong> {user()?.email}
            </p>
          </div>

          {/* Formular */}
          <form onSubmit={handleSubmit} class="space-y-6">
            {/* Ist der Gegenstand verloren oder gefunden? */}
            <div>
              <label class="block text-gray-700 text-lg font-semibold mb-2">
                Ist der Gegenstand verloren oder gefunden? <span class="text-red-500">*</span>
              </label>
              <div class="flex items-center space-x-6">
                <label class="inline-flex items-center">
                  <input 
                    type="radio" 
                    name="type" 
                    value="isLost" 
                    checked={itemType() === 'isLost'}
                    onChange={(e) => setItemType(e.currentTarget.value as 'isLost')}
                    class="form-radio h-5 w-5 text-blue-600 rounded-full" 
                    required
                  />
                  <span class="ml-2 text-gray-700 text-base">Verloren</span>
                </label>
                <label class="inline-flex items-center">
                  <input 
                    type="radio" 
                    name="type" 
                    value="isFound" 
                    checked={itemType() === 'isFound'}
                    onChange={(e) => setItemType(e.currentTarget.value as 'isFound')}
                    class="form-radio h-5 w-5 text-blue-600 rounded-full" 
                    required
                  />
                  <span class="ml-2 text-gray-700 text-base">Gefunden</span>
                </label>
              </div>
            </div>

            {/* Gegenstandsname */}
            <div>
              <label for="name" class="block text-gray-700 text-lg font-semibold mb-2">
                Gegenstandsname <span class="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                id="name" 
                value={itemName()}
                onInput={(e) => setItemName(e.currentTarget.value)}
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-base" 
                placeholder="Name des Gegenstands" 
                required
              />
            </div>

            {/* Kategorie Dropdown (DYNAMISCH BEFÜLLT) */}
            <div>
              <label for="category" class="block text-gray-700 text-lg font-semibold mb-2">
                Kategorie <span class="text-red-500">*</span>
              </label>
              <select 
                id="category" 
                value={selectedCategory()}
                onChange={(e) => setSelectedCategory(e.currentTarget.value)}
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-base" 
                required
              >
                <option value="">Wählen Sie eine Kategorie</option>
                <For each={categories()}>
                  {(category) => (
                    <option value={category.id}>{category.name}</option>
                  )}
                </For>
              </select>
            </div>

            {/* Ort Dropdown (DYNAMISCH BEFÜLLT) */}
            <div>
              <label for="location" class="block text-gray-700 text-lg font-semibold mb-2">
                Ort <span class="text-red-500">*</span>
              </label>
              <select 
                id="location" 
                value={selectedLocation()}
                onChange={(e) => setSelectedLocation(e.currentTarget.value)}
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-base" 
                required
              >
                <option value="">Wählen Sie einen Ort</option>
                <For each={locations()}>
                  {(location) => (
                    <option value={location.id}>{location.name}</option>
                  )}
                </For>
              </select>
            </div>

            {/* Datum verloren/gefunden */}
            <div>
              <label for="date" class="block text-gray-700 text-lg font-semibold mb-2">
                Datum verloren/gefunden
              </label>
              {/* Durch onclick wird beim Klick auf irgendeine Stelle im Feld sofort der Date-Picker geöffnet */}
              <input
                type="date"
                id="date"
                value={selectedDate()}
                onInput={(e) => setSelectedDate(e.currentTarget.value)}
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-base cursor-pointer"
                onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker()}
              />
            </div>

            {/* Beschreibung */}
            <div>
              <label for="description" class="block text-gray-700 text-lg font-semibold mb-2">
                Beschreibung
              </label>
              <textarea 
                id="description" 
                value={description()}
                onInput={(e) => setDescription(e.currentTarget.value)}
                rows="4" 
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-base" 
                placeholder="Geben Sie Details wie Farbe, Marke, besondere Merkmale usw. an."
              />
            </div>

            {/* Bild-Upload */}
            <div>
              <label for="img" class="block text-gray-700 text-lg font-semibold mb-2">
                Bild hochladen
              </label>
              <div class="space-y-4">
                <input 
                  type="file" 
                  id="img" 
                  ref={fileInputRef!}
                  accept="image/*" 
                  onChange={handleImageChange}
                  class="w-full text-base file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                />
                
                {/* Bildvorschau */}
                {imagePreview() && (
                  <div>
                    <img 
                      src={imagePreview()} 
                      alt="Vorschau" 
                      class="max-w-xs max-h-48 rounded-lg shadow-md"
                    />
                    <button 
                      type="button" 
                      onClick={removeImage}
                      class="mt-2 text-red-600 hover:text-red-800 text-sm"
                    >
                      Bild entfernen
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Nachrichtenbereich für Feedback */}
            {message() && (
              <div class={`p-3 rounded-md text-center ${
                messageType() === 'success' ? 'bg-green-100 text-green-800' :
                messageType() === 'error' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {message()}
              </div>
            )}

            {/* Absenden-Button */}
            <div class="text-center">
              <button 
                type="submit" 
                disabled={loading()}
                class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out shadow-md disabled:opacity-50"
              >
                {loading() ? 'Wird gesendet...' : 'Bericht absenden'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
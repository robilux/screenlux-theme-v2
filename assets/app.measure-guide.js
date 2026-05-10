import { h, render } from 'https://esm.sh/preact';
import htm from 'https://esm.sh/htm';
import { useState, useEffect } from 'https://esm.sh/preact/hooks';

// Initialize htm with Preact
const html = htm.bind(h);

// Icons
const RulerIcon = () => html`
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21.3 15.3l-3.6-3.6a2 2 0 0 0-2.8 0l-9.6 9.6a2 2 0 0 0 0 2.8l3.6 3.6a2 2 0 0 0 2.8 0l9.6-9.6a2 2 0 0 0 0-2.8z"></path>
    <path d="M14.5 10.5l4-4"></path>
    <path d="M10.5 14.5l4-4"></path>
    <path d="M6.5 18.5l4-4"></path>
  </svg>
`;

const EditIcon = () => html`
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
`;

const TrashIcon = () => html`
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
`;

// App Component
const MeasureApp = () => {
  // State
  const [step, setStep] = useState('start'); // start, overview, type, mount, width, height, name
  const [windows, setWindows] = useState([]);
  const [draftWindow, setDraftWindow] = useState(null);
  
  // Local storage sync
  useEffect(() => {
    const saved = localStorage.getItem('screenlux_measurements');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWindows(parsed);
        if (parsed.length > 0) {
          setStep('overview');
        }
      } catch (e) {
        console.error('Failed to parse saved measurements');
      }
    }
  }, []);

  const saveToStorage = (newWindows) => {
    setWindows(newWindows);
    localStorage.setItem('screenlux_measurements', JSON.stringify(newWindows));
  };

  const startNewWindow = () => {
    setDraftWindow({
      id: Date.now().toString(),
      type: '',
      mountType: '',
      widthTop: '',
      widthMiddle: '',
      widthBottom: '',
      heightLeft: '',
      heightRight: '',
      name: ''
    });
    setStep('type');
  };

  const editWindow = (id) => {
    const win = windows.find(w => w.id === id);
    if (win) {
      setDraftWindow({ ...win });
      setStep('type');
    }
  };

  const removeWindow = (id) => {
    if (confirm('Er du sikker på at du vil slette dette vinduet?')) {
      saveToStorage(windows.filter(w => w.id !== id));
    }
  };

  // Step renderers
  const renderStart = () => html`
    <div class="measure-container">
      <div class="measure-header">
        <h1>Oppmålingsguide</h1>
      </div>
      <div class="measure-card intro-card">
        <div class="ruler-icon-wrapper"><${RulerIcon} /></div>
        <h2>Det du trenger:</h2>
        <ul class="info-list">
          <li>Målebånd (helst stål/laser)</li>
          <li>Noe å skrive på/med</li>
          <li>Omtrent 5-10 minutter</li>
        </ul>
        <button class="measure-btn primary full-width" onClick=${() => setStep('overview')}>Start oppmåling</button>
      </div>
    </div>
  `;

  const renderOverview = () => html`
    <div class="measure-container">
      <div class="measure-header">
        <h1>Dine vinduer</h1>
      </div>
      <div class="measure-content">
        ${windows.length === 0 ? html`
          <p class="empty-state">Du har ikke lagt til noen vinduer enda.</p>
        ` : html`
          <div class="windows-list">
            ${windows.map((win, i) => html`
              <div class="window-card">
                <div class="window-card-info">
                  <div class="window-card-image">
                    <img src=${window.MeasureAppConfig.assets.windowUtenRamme} alt="Vindu" />
                  </div>
                  <div class="window-card-details">
                    <h3>${win.name || `Vindu ${i + 1}`}</h3>
                    <p>${win.type} • B: ${Math.min(win.widthTop, win.widthMiddle, win.widthBottom) || '?'} mm • H: ${Math.min(win.heightLeft, win.heightRight) || '?'} mm</p>
                  </div>
                </div>
                <div class="window-card-actions">
                  <button class="text-btn" onClick=${() => editWindow(win.id)}><${EditIcon} /> Rediger</button>
                  <button class="text-btn text-btn-danger" onClick=${() => removeWindow(win.id)}><${TrashIcon} /> Slett</button>
                </div>
              </div>
            `)}
          </div>
        `}
        <button class="measure-btn secondary full-width" onClick=${startNewWindow}>+ Legg til vindu</button>
      </div>
    </div>
  `;

  const renderTypeSelection = () => html`
    <div class="measure-container">
      <div class="measure-header">
        <h1>Velg vindustype</h1>
        <button class="back-btn" onClick=${() => setStep('overview')}>Tilbake</button>
      </div>
      <div class="measure-content options-grid">
        <div class="option-card ${draftWindow.type === 'Uten ramme' ? 'selected' : ''}" 
             onClick=${() => setDraftWindow({...draftWindow, type: 'Uten ramme'})}>
          <img src=${window.MeasureAppConfig.assets.windowUtenRamme} alt="Vindu uten ramme" />
          <h3>Vindu uten ramme eller vannbord i topp</h3>
        </div>
        <div class="option-card ${draftWindow.type === 'Med vannbord' ? 'selected' : ''}"
             onClick=${() => setDraftWindow({...draftWindow, type: 'Med vannbord'})}>
          <img src=${window.MeasureAppConfig.assets.windowMedVannbord} alt="Vindu med vannbord" />
          <h3>Vindu med vannbord og/eller omramming</h3>
        </div>
        <div class="option-card ${draftWindow.type === 'Skyvedør' ? 'selected' : ''}"
             onClick=${() => setDraftWindow({...draftWindow, type: 'Skyvedør'})}>
          <img src=${window.MeasureAppConfig.assets.windowSkyvedor} alt="Skyvedør eller andre typer" />
          <h3>Skyvedør eller andre typer</h3>
        </div>
      </div>
      <div class="measure-footer">
        <button class="measure-btn primary full-width" 
                disabled=${!draftWindow.type}
                onClick=${() => setStep('mount')}>Neste</button>
      </div>
    </div>
  `;

  const renderMountSelection = () => html`
    <div class="measure-container">
      <div class="measure-header">
        <h1>Innvendig eller utvendig montering?</h1>
        <button class="back-btn" onClick=${() => setStep('type')}>Tilbake</button>
      </div>
      <div class="measure-content options-grid">
        <div class="option-card ${draftWindow.mountType === 'Innvendig' ? 'selected' : ''}" 
             onClick=${() => setDraftWindow({...draftWindow, mountType: 'Innvendig'})}>
          <img src=${window.MeasureAppConfig.assets.zipScreenInni} alt="Montering inni nisje" />
          <h3>Zip-Screen monteres INNI nisje</h3>
        </div>
        <div class="option-card ${draftWindow.mountType === 'Utvendig' ? 'selected' : ''}"
             onClick=${() => setDraftWindow({...draftWindow, mountType: 'Utvendig'})}>
          <img src=${window.MeasureAppConfig.assets.zipScreenUtenpaa} alt="Montering utenpå" />
          <h3>Zip-Screen monteres UTENPÅ omramming / på vegg</h3>
        </div>
      </div>
      <div class="measure-footer">
        <button class="measure-btn primary full-width" 
                disabled=${!draftWindow.mountType}
                onClick=${() => setStep('width')}>Neste</button>
      </div>
    </div>
  `;

  const renderWidth = () => html`
    <div class="measure-container">
      <div class="measure-header">
        <h1>Mål bredde</h1>
        <button class="back-btn" onClick=${() => setStep('mount')}>Tilbake</button>
      </div>
      <div class="measure-content">
        <div class="instruction-image">
          <img src=${window.MeasureAppConfig.assets.measureWidth} alt="Mål bredde" />
        </div>
        <div class="input-group">
          <label>Bredde topp (mm)</label>
          <input type="number" placeholder="F.eks. 1200" value=${draftWindow.widthTop} 
                 onInput=${e => setDraftWindow({...draftWindow, widthTop: e.target.value})} />
        </div>
        <div class="input-group">
          <label>Bredde midten (mm)</label>
          <input type="number" placeholder="F.eks. 1202" value=${draftWindow.widthMiddle} 
                 onInput=${e => setDraftWindow({...draftWindow, widthMiddle: e.target.value})} />
        </div>
        <div class="input-group">
          <label>Bredde bunn (mm)</label>
          <input type="number" placeholder="F.eks. 1198" value=${draftWindow.widthBottom} 
                 onInput=${e => setDraftWindow({...draftWindow, widthBottom: e.target.value})} />
        </div>
      </div>
      <div class="measure-footer">
        <button class="measure-btn primary full-width" 
                disabled=${!draftWindow.widthTop || !draftWindow.widthMiddle || !draftWindow.widthBottom}
                onClick=${() => setStep('height')}>Neste</button>
      </div>
    </div>
  `;

  const renderHeight = () => html`
    <div class="measure-container">
      <div class="measure-header">
        <h1>Mål høyde</h1>
        <button class="back-btn" onClick=${() => setStep('width')}>Tilbake</button>
      </div>
      <div class="measure-content">
        <div class="instruction-image">
          <img src=${window.MeasureAppConfig.assets.measureHeight} alt="Mål høyde" />
        </div>
        <div class="input-group">
          <label>Høyde venstre (mm)</label>
          <input type="number" placeholder="F.eks. 1500" value=${draftWindow.heightLeft} 
                 onInput=${e => setDraftWindow({...draftWindow, heightLeft: e.target.value})} />
        </div>
        <div class="input-group">
          <label>Høyde høyre (mm)</label>
          <input type="number" placeholder="F.eks. 1502" value=${draftWindow.heightRight} 
                 onInput=${e => setDraftWindow({...draftWindow, heightRight: e.target.value})} />
        </div>
      </div>
      <div class="measure-footer">
        <button class="measure-btn primary full-width" 
                disabled=${!draftWindow.heightLeft || !draftWindow.heightRight}
                onClick=${() => setStep('name')}>Neste</button>
      </div>
    </div>
  `;

  const saveCurrentDraft = () => {
    let updatedWindows = [...windows];
    const existingIndex = updatedWindows.findIndex(w => w.id === draftWindow.id);
    
    if (existingIndex >= 0) {
      updatedWindows[existingIndex] = draftWindow;
    } else {
      updatedWindows.push(draftWindow);
    }
    
    saveToStorage(updatedWindows);
    setStep('overview');
  };

  const renderName = () => html`
    <div class="measure-container">
      <div class="measure-header">
        <h1>Navngi og lagre</h1>
        <button class="back-btn" onClick=${() => setStep('height')}>Tilbake</button>
      </div>
      <div class="measure-content">
        <div class="input-group">
          <label>Hva skal vinduet hete?</label>
          <input type="text" placeholder="F.eks. Stue Vindu Venstre" value=${draftWindow.name} 
                 onInput=${e => setDraftWindow({...draftWindow, name: e.target.value})} />
        </div>
      </div>
      <div class="measure-footer">
        <button class="measure-btn primary full-width" 
                disabled=${!draftWindow.name}
                onClick=${saveCurrentDraft}>Lagre målene</button>
      </div>
    </div>
  `;

  // Main Render Switch
  switch(step) {
    case 'start': return renderStart();
    case 'overview': return renderOverview();
    case 'type': return renderTypeSelection();
    case 'mount': return renderMountSelection();
    case 'width': return renderWidth();
    case 'height': return renderHeight();
    case 'name': return renderName();
    default: return renderStart();
  }
};

// Mount the App
const rootNode = document.getElementById('measure-app-root');
if (rootNode) {
  render(html`<${MeasureApp} />`, rootNode);
}

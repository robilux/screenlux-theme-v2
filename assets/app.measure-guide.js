import { h, render } from 'https://esm.sh/preact';
import htm from 'https://esm.sh/htm';
import { useState, useEffect } from 'https://esm.sh/preact/hooks';

// Initialize htm with Preact
const html = htm.bind(h);

// Icons
const RulerIcon = () => html`
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M51.4752 16.0498L39.9493 4.52602C39.6243 4.20093 39.2384 3.94305 38.8137 3.76711C38.389 3.59117 37.9338 3.50061 37.4741 3.50061C37.0144 3.50061 36.5592 3.59117 36.1346 3.76711C35.7099 3.94305 35.324 4.20093 34.999 4.52602L4.52272 35.0001C4.19763 35.3251 3.93975 35.711 3.76381 36.1357C3.58787 36.5603 3.49731 37.0155 3.49731 37.4752C3.49731 37.9349 3.58787 38.3901 3.76381 38.8148C3.93975 39.2395 4.19763 39.6254 4.52272 39.9504L16.0487 51.4741C16.3737 51.7992 16.7595 52.0571 17.1842 52.2331C17.6089 52.409 18.0641 52.4995 18.5238 52.4995C18.9835 52.4995 19.4387 52.409 19.8634 52.2331C20.2881 52.0571 20.674 51.7992 20.999 51.4741L51.4752 21.0001C51.8003 20.6751 52.0582 20.2892 52.2341 19.8645C52.4101 19.4398 52.5006 18.9846 52.5006 18.5249C52.5006 18.0652 52.4101 17.61 52.2341 17.1853C52.0582 16.7607 51.8003 16.3748 51.4752 16.0498ZM18.5227 49.0001L6.99897 37.4741L13.999 30.4741L19.7608 36.2382C19.9234 36.4008 20.1165 36.5298 20.3289 36.6178C20.5413 36.7058 20.769 36.7511 20.999 36.7511C21.2289 36.7511 21.4566 36.7058 21.669 36.6178C21.8815 36.5298 22.0745 36.4008 22.2371 36.2382C22.3997 36.0756 22.5287 35.8826 22.6167 35.6701C22.7047 35.4577 22.7499 35.23 22.7499 35.0001C22.7499 34.7701 22.7047 34.5424 22.6167 34.33C22.5287 34.1176 22.3997 33.9245 22.2371 33.762L16.473 28.0001L20.999 23.4741L26.7608 29.2382C27.0892 29.5666 27.5346 29.7511 27.999 29.7511C28.4634 29.7511 28.9087 29.5666 29.2371 29.2382C29.5655 28.9098 29.7499 28.4645 29.7499 28.0001C29.7499 27.5357 29.5655 27.0903 29.2371 26.762L23.473 21.0001L27.999 16.4741L33.7608 22.2382C33.9234 22.4008 34.1165 22.5298 34.3289 22.6178C34.5413 22.7058 34.769 22.7511 34.999 22.7511C35.2289 22.7511 35.4566 22.7058 35.669 22.6178C35.8815 22.5298 36.0745 22.4008 36.2371 22.2382C36.3997 22.0756 36.5287 21.8826 36.6167 21.6701C36.7047 21.4577 36.7499 21.23 36.7499 21.0001C36.7499 20.7701 36.7047 20.5424 36.6167 20.33C36.5287 20.1176 36.3997 19.9245 36.2371 19.762L30.473 14.0001L37.473 7.00008L48.999 18.526L18.5227 49.0001Z" fill="#5B5BF9"/>
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

const CopyIcon = () => html`
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
`;

const UploadIcon = () => html`
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
`;

const CheckCircleIcon = () => html`
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.5459 8.95406C16.6508 9.05858 16.734 9.18277 16.7908 9.31952C16.8476 9.45626 16.8768 9.60287 16.8768 9.75094C16.8768 9.899 16.8476 10.0456 16.7908 10.1824C16.734 10.3191 16.6508 10.4433 16.5459 10.5478L11.2959 15.7978C11.1914 15.9027 11.0672 15.9859 10.9305 16.0427C10.7937 16.0995 10.6471 16.1287 10.4991 16.1287C10.351 16.1287 10.2044 16.0995 10.0676 16.0427C9.9309 15.9859 9.80671 15.9027 9.70219 15.7978L7.45219 13.5478C7.34754 13.4432 7.26453 13.3189 7.2079 13.1822C7.15127 13.0455 7.12212 12.8989 7.12212 12.7509C7.12212 12.6029 7.15127 12.4564 7.2079 12.3197C7.26453 12.1829 7.34754 12.0587 7.45219 11.9541C7.55684 11.8494 7.68107 11.7664 7.8178 11.7098C7.95453 11.6531 8.10107 11.624 8.24907 11.624C8.39706 11.624 8.5436 11.6531 8.68033 11.7098C8.81706 11.7664 8.94129 11.8494 9.04594 11.9541L10.5 13.4062L14.9541 8.95125C15.0587 8.84684 15.183 8.76408 15.3196 8.7077C15.4563 8.65133 15.6027 8.62245 15.7506 8.62271C15.8984 8.62297 16.0448 8.65237 16.1812 8.70922C16.3177 8.76608 16.4416 8.84928 16.5459 8.95406ZM22.125 12C22.125 14.0025 21.5312 15.9601 20.4186 17.6251C19.3061 19.2902 17.7248 20.5879 15.8747 21.3543C14.0246 22.1206 11.9888 22.3211 10.0247 21.9305C8.06066 21.5398 6.25656 20.5755 4.84055 19.1595C3.42454 17.7435 2.46023 15.9393 2.06955 13.9753C1.67888 12.0112 1.87939 9.97543 2.64572 8.12533C3.41206 6.27523 4.70981 4.69392 6.37486 3.58137C8.0399 2.46882 9.99747 1.875 12 1.875C14.6844 1.87798 17.258 2.94567 19.1562 4.84383C21.0543 6.74199 22.122 9.3156 22.125 12ZM19.875 12C19.875 10.4425 19.4131 8.91992 18.5478 7.62488C17.6825 6.32985 16.4526 5.32049 15.0136 4.72445C13.5747 4.12841 11.9913 3.97246 10.4637 4.27632C8.93607 4.58017 7.53288 5.3302 6.43154 6.43153C5.3302 7.53287 4.58018 8.93606 4.27632 10.4637C3.97246 11.9913 4.12841 13.5747 4.72445 15.0136C5.32049 16.4526 6.32985 17.6825 7.62489 18.5478C8.91993 19.4131 10.4425 19.875 12 19.875C14.0879 19.8728 16.0896 19.0424 17.566 17.566C19.0424 16.0896 19.8728 14.0879 19.875 12Z" fill="#0EA674"/>
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

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

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
      name: '',
      image: null
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

  const duplicateWindow = (id) => {
    const win = windows.find(w => w.id === id);
    if (win) {
      saveToStorage([...windows, { ...win, id: Date.now().toString(), name: win.name ? win.name + ' (Kopi)' : '' }]);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setDraftWindow({...draftWindow, image: event.target.result});
      };
      reader.readAsDataURL(file);
    }
  };

  // Step renderers
  const renderStart = () => html`
    <div class="measure-container">
      <div class="measure-card intro-card">
        <div class="ruler-icon-wrapper"><${RulerIcon} /></div>
        <div class="intro-header" style="text-align: center;">
          <h1 style="margin-bottom: 0;">Mål vinduene dine</h1>
          <p style="color: rgba(var(--color-foreground), 0.7); line-height: 1.5; margin-top: 12px;">Få den perfekte passformen for dine zip-screens med noen få enkle trinn. Vi veileder deg gjennom målingen av hvert vindu for å sikre riktige mål.</p>
        </div>
        <div class="requirements-box">
          <h2 style="text-align: center; font-size: 18px; margin-bottom: 16px;">Det du trenger:</h2>
          <ul class="info-list">
            <li><${CheckCircleIcon} /> Målebånd eller lasermåler</li>
            <li><${CheckCircleIcon} /> En mobiltelefon</li>
            <li><${CheckCircleIcon} /> 5-10 minutter per vindu</li>
          </ul>
        </div>
        <button class="button--brand" style="margin-top: 24px; width: 100%;" onClick=${() => setStep('overview')}>Start nå!</button>
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
          <p class="empty-state">Kom i gang og legg til ditt første vindu!</p>
          <button class="dashed-add-btn full-width" onClick=${startNewWindow}>+ Legg til vindu</button>
        ` : html`
          <div class="windows-list">
            ${windows.map((win, i) => html`
              <div class="window-card">
                <div class="window-card-info">
                  <div class="window-card-image">
                    <img src=${win.image || window.MeasureAppConfig.assets.windowUtenRamme} alt="Vindu" />
                  </div>
                  <div class="window-card-details" style="display: flex; flex-direction: column; gap: 4px;">
                    <h3 style="margin: 0;">${win.name || `Vindu ${i + 1}`}</h3>
                    <p style="margin: 0; font-size: 14px; color: rgba(var(--color-foreground), 0.7);">Bredde (T/M/B): ${win.widthTop || '?'} / ${win.widthMiddle || '?'} / ${win.widthBottom || '?'} mm</p>
                    <p style="margin: 0; font-size: 14px; color: rgba(var(--color-foreground), 0.7);">Høyde (V/H): ${win.heightLeft || '?'} / ${win.heightRight || '?'} mm</p>
                    ${win.type ? html`<p style="margin: 0; font-size: 14px; color: rgba(var(--color-foreground), 0.7);">${win.type === 'Uten ramme' ? 'Vindu uten ramme eller vannbord i topp' : win.type === 'Med vannbord' ? 'Vindu med vannbord og/eller omramming' : 'Skyvedør eller andre typer'}</p>` : ''}
                    ${win.mountType ? html`<p style="margin: 0; font-size: 14px; color: rgba(var(--color-foreground), 0.7);">${win.mountType === 'Innvendig' ? 'Zip-Screen monteres INNI nisje' : 'Zip-Screen monteres UTENPÅ omramming / på vegg'}</p>` : ''}
                  </div>
                </div>
                <div class="window-card-actions">
                  <button class="text-btn" onClick=${() => editWindow(win.id)}><${EditIcon} /> Rediger</button>
                  <button class="text-btn" onClick=${() => duplicateWindow(win.id)}><${CopyIcon} /> Dupliser</button>
                  <button class="text-btn text-btn-danger" onClick=${() => removeWindow(win.id)}><${TrashIcon} /> Fjern</button>
                </div>
              </div>
            `)}
          </div>
          <button class="dashed-add-btn full-width" onClick=${startNewWindow}>+ Legg til et til</button>
          
          <hr class="measure-divider" />
          
          <div class="measure-footer" style="padding: 24px 0 0 0; border: none; background: none; margin-top: 0;">
            <button class="button--brand full-width" style="width: 100%;" onClick=${() => { alert('Konfigurer screens'); }}>Konfigurer screens</button>
          </div>
        `}
      </div>
    </div>
  `;

  const renderTypeSelection = () => html`
    <div class="measure-container">
      <div class="measure-header">
        <h1>Velg vindustype</h1>
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
      <div class="measure-footer measure-footer-buttons">
        <button class="button--brand-secondary" onClick=${() => setStep('overview')}>Tilbake</button>
        <button class="button--brand" 
                disabled=${!draftWindow.type}
                onClick=${() => setStep('mount')}>Neste</button>
      </div>
    </div>
  `;

  const renderMountSelection = () => html`
    <div class="measure-container">
      <div class="measure-header">
        <h1>Innvendig eller utvendig montering?</h1>
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
      <div class="measure-footer measure-footer-buttons">
        <button class="button--brand-secondary" onClick=${() => setStep('type')}>Tilbake</button>
        <button class="button--brand" 
                disabled=${!draftWindow.mountType}
                onClick=${() => setStep('width')}>Neste</button>
      </div>
    </div>
  `;

  const renderWidth = () => html`
    <div class="measure-container">
      <div class="measure-header">
        <h1>Mål bredden</h1>
      </div>
      <div class="measure-content">
        <div class="instruction-image">
          <img src=${window.MeasureAppConfig.assets.measureWidth} alt="Mål bredde" />
        </div>
        <div class="input-group">
          <label class="field-label">Topp (mm)</label>
          <input class="sl-input" type="number" placeholder="F. eks 3000" value=${draftWindow.widthTop} 
                 onInput=${e => setDraftWindow({...draftWindow, widthTop: e.target.value})} />
        </div>
        <div class="input-group">
          <label class="field-label">Midten (mm)</label>
          <input class="sl-input" type="number" placeholder="F. eks 3007" value=${draftWindow.widthMiddle} 
                 onInput=${e => setDraftWindow({...draftWindow, widthMiddle: e.target.value})} />
        </div>
        <div class="input-group">
          <label class="field-label">Bunn (mm)</label>
          <input class="sl-input" type="number" placeholder="F. eks 3012" value=${draftWindow.widthBottom} 
                 onInput=${e => setDraftWindow({...draftWindow, widthBottom: e.target.value})} />
        </div>
      </div>
      <div class="measure-footer measure-footer-buttons">
        <button class="button--brand-secondary" onClick=${() => setStep('mount')}>Tilbake</button>
        <button class="button--brand" 
                disabled=${!draftWindow.widthTop || !draftWindow.widthMiddle || !draftWindow.widthBottom}
                onClick=${() => setStep('height')}>Neste</button>
      </div>
    </div>
  `;

  const renderHeight = () => html`
    <div class="measure-container">
      <div class="measure-header">
        <h1>Mål høyden</h1>
      </div>
      <div class="measure-content">
        <div class="instruction-image">
          <img src=${window.MeasureAppConfig.assets.measureHeight} alt="Mål høyde" />
        </div>
        <div class="input-group">
          <label class="field-label">Venstre (mm)</label>
          <input class="sl-input" type="number" placeholder="F. eks 2000" value=${draftWindow.heightLeft} 
                 onInput=${e => setDraftWindow({...draftWindow, heightLeft: e.target.value})} />
        </div>
        <div class="input-group">
          <label class="field-label">Høyre (mm)</label>
          <input class="sl-input" type="number" placeholder="F. eks 2002" value=${draftWindow.heightRight} 
                 onInput=${e => setDraftWindow({...draftWindow, heightRight: e.target.value})} />
        </div>
      </div>
      <div class="measure-footer measure-footer-buttons">
        <button class="button--brand-secondary" onClick=${() => setStep('width')}>Tilbake</button>
        <button class="button--brand" 
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
        <h1>Gi vinduet ditt et navn og et bilde for å holde orden</h1>
      </div>
      <div class="measure-content">
        <div class="input-group">
          <label class="field-label">Navn (valgfritt)</label>
          <input class="sl-input" type="text" placeholder="F.eks. Kjøkken venstre" value=${draftWindow.name} 
                 onInput=${e => setDraftWindow({...draftWindow, name: e.target.value})} />
        </div>
        
        <div class="input-group" style="margin-top: 32px;">
          <label class="field-label">Bilde (valgfritt)</label>
          <label class="image-upload-area" style="display: flex; cursor: pointer;">
            <input type="file" accept="image/*" style="display: none;" onChange=${handleImageUpload} />
            ${draftWindow.image ? html`
              <img src=${draftWindow.image} style="max-height: 150px; border-radius: 8px; object-fit: contain;" alt="Opplastet bilde" />
            ` : html`
              <${UploadIcon} />
              <p>Slipp bildet her, eller klikk for å laste opp</p>
            `}
          </label>
        </div>
      </div>
      <div class="measure-footer measure-footer-buttons">
        <button class="button--brand-secondary" onClick=${() => setStep('height')}>Tilbake</button>
        <button class="button--brand" 
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

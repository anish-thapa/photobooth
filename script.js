document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const video = document.getElementById('video-feed');
    const captureCanvas = document.getElementById('capture-canvas');
    const captureButton = document.getElementById('capture-button');
    const numPicturesInput = document.getElementById('num-pictures');
    const outputGallery = document.getElementById('output-gallery');
    const photoStrip = document.getElementById('photo-strip');
    const countdownMessage = document.getElementById('countdown-message');
    const downloadCollageButton = document.getElementById('download-collage-button');
    const collageBgColorInput = document.getElementById('collage-bg-color');
    const collageLayoutSelect = document.getElementById('collage-layout-select');
    
    const captureFilterSelect = document.getElementById('capture-filter-select');
    const captureStickerPalette = document.getElementById('capture-sticker-palette');
    const captureStickerPositionSelect = document.getElementById('capture-sticker-position-select');

    const editPhotoSection = document.getElementById('edit-photo-section');
    const editFilterSelect = document.getElementById('edit-filter-select');
    const editStickerPalette = document.getElementById('edit-sticker-palette');
    const editStickerPositionSelect = document.getElementById('edit-sticker-position-select');
    const clearEditsButton = document.getElementById('clear-edits-button');

    const captureContext = captureCanvas.getContext('2d');

    // --- State Variables ---
    let stream;
    let currentVideoFilterClass = 'filter-none';
    
    let defaultCaptureEmoji = null;
    let defaultCaptureEmojiElement = null;
    let defaultCaptureStickerPosition = 'none';

    let activePhotoForEditing = null;
    let currentEditEmoji = null; 
    let currentEditStickerPaletteElement = null;
    let currentEditStickerPosition = 'none'; 

    const emojiStickersArray = ["😀", "😂", "😍", "🥳", "😎", "😭", "👍", "❤️", "⭐", "🎉", "🍕", "👑", "🚀", "💡", "💯", "✨", "👀", "👻", "👽", "🤖", "💼", "🎩", "🕶️", "💬", "💀", "🎞️"];
    const EMOJI_FONT_SIZE_ON_CANVAS = 52;
    const STICKER_PADDING_CANVAS = 25;

    // --- Initialization ---
    async function initWebcam() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            video.srcObject = stream;
            applyVideoFilterPreview(captureFilterSelect.value);
            captureButton.disabled = false;
        } catch (err) {
            console.error("Error accessing webcam:", err);
            countdownMessage.textContent = "Webcam Error. Check permissions.";
            captureButton.disabled = true;
        }
    }

    function populateControlDropdowns() {
        editFilterSelect.innerHTML = ''; // Clear existing options first
        Array.from(captureFilterSelect.options).forEach(optionNode => {
            editFilterSelect.add(optionNode.cloneNode(true));
        });
    }

    function populateStickerPalettes() {
        // Populate Capture Sticker Palette
        captureStickerPalette.innerHTML = ''; // Clear existing
        emojiStickersArray.forEach(emojiChar => {
            const stickerSpan = document.createElement('span');
            stickerSpan.textContent = emojiChar;
            stickerSpan.classList.add('emoji-sticker');
            stickerSpan.addEventListener('click', () => {
                if (defaultCaptureEmojiElement) {
                    defaultCaptureEmojiElement.classList.remove('active-capture-sticker');
                }
                if (defaultCaptureEmoji === emojiChar) {
                    defaultCaptureEmoji = null;
                    defaultCaptureEmojiElement = null;
                    // captureStickerPositionSelect.value = "none"; // Optional: reset position
                    // defaultCaptureStickerPosition = "none";
                } else {
                    defaultCaptureEmoji = emojiChar;
                    defaultCaptureEmojiElement = stickerSpan;
                    stickerSpan.classList.add('active-capture-sticker');
                    if (captureStickerPositionSelect.value === "none" && defaultCaptureEmoji) {
                         captureStickerPositionSelect.value = "top-right";
                         defaultCaptureStickerPosition = "top-right";
                    }
                }
            });
            captureStickerPalette.appendChild(stickerSpan);
        });

        // Populate Edit Sticker Palette
        editStickerPalette.innerHTML = ''; // Clear existing
        emojiStickersArray.forEach(emojiChar => {
            const stickerSpan = document.createElement('span');
            stickerSpan.textContent = emojiChar;
            stickerSpan.classList.add('emoji-sticker');
            stickerSpan.addEventListener('click', () => {
                if (currentEditStickerPaletteElement) {
                    currentEditStickerPaletteElement.classList.remove('active-edit-sticker');
                }
                if (currentEditEmoji === emojiChar) {
                    currentEditEmoji = null;
                    currentEditStickerPaletteElement = null;
                } else {
                    currentEditEmoji = emojiChar;
                    currentEditStickerPaletteElement = stickerSpan;
                    stickerSpan.classList.add('active-edit-sticker');
                     if (editStickerPositionSelect.value === "none" && currentEditEmoji) {
                         editStickerPositionSelect.value = "top-right";
                         currentEditStickerPosition = "top-right";
                    }
                }
                renderActivePhotoWithEdits();
            });
            editStickerPalette.appendChild(stickerSpan);
        });
    }
    
    // --- Event Listeners ---
    captureFilterSelect.addEventListener('change', (e) => applyVideoFilterPreview(e.target.value));
    captureButton.addEventListener('click', takePictureSequence);
    downloadCollageButton.addEventListener('click', downloadPhotoStrip);
    collageBgColorInput.addEventListener('input', (e) => outputGallery.style.backgroundColor = e.target.value);
    collageLayoutSelect.addEventListener('change', (e) => updateCollageLayout(e.target.value));
    
    captureStickerPositionSelect.addEventListener('change', (e) => {
        defaultCaptureStickerPosition = e.target.value;
        if (defaultCaptureStickerPosition === "none" && defaultCaptureEmoji) {
            if(defaultCaptureEmojiElement) defaultCaptureEmojiElement.classList.remove('active-capture-sticker');
            defaultCaptureEmoji = null; defaultCaptureEmojiElement = null;
        }
    });
    
    editFilterSelect.addEventListener('change', renderActivePhotoWithEdits);
    editStickerPositionSelect.addEventListener('change', (e) => {
        currentEditStickerPosition = e.target.value;
        // If "No Emoji" is selected for position, also clear the selected emoji for editing
        if (currentEditStickerPosition === "none" && currentEditEmoji) {
            if(currentEditStickerPaletteElement) currentEditStickerPaletteElement.classList.remove('active-edit-sticker');
            currentEditEmoji = null;
            currentEditStickerPaletteElement = null;
        }
        renderActivePhotoWithEdits();
    });

    clearEditsButton.addEventListener('click', () => {
        if (activePhotoForEditing) {
            applyFilterAndStickerToImage(
                activePhotoForEditing,
                activePhotoForEditing.dataset.captureFilter,
                activePhotoForEditing.dataset.captureSticker,
                activePhotoForEditing.dataset.captureStickerPosition
            );
            activePhotoForEditing.dataset.currentEditFilter = activePhotoForEditing.dataset.captureFilter;
            // dataset.sticker and dataset.stickerPosition are updated by applyFilterAndStickerToImage
            activatePhotoEditingUI(activePhotoForEditing);
        }
    });

    photoStrip.addEventListener('click', handlePhotoFrameClick);

    // --- Core Functions ---
    function applyVideoFilterPreview(selectedFilterValue) {
        video.classList.remove(currentVideoFilterClass);
        video.style.filter = selectedFilterValue;
        if (selectedFilterValue !== 'none') {
            let baseFilterName = selectedFilterValue.split('(')[0].toLowerCase();
            if (selectedFilterValue.includes(" ") || selectedFilterValue.includes(")")) {
                 baseFilterName = selectedFilterValue.replace(/[()%, ]/g, '-').toLowerCase().replace(/--+/g, '-').replace(/-$/, '');
            }
            currentVideoFilterClass = `filter-${baseFilterName}`;
             const videoClassList = Array.from(video.classList).filter(cls => cls.startsWith('filter-'));
             videoClassList.forEach(cls => video.classList.remove(cls)); // Remove all old filter classes
             if (document.querySelector(`.${currentVideoFilterClass}`)) {
                video.classList.add(currentVideoFilterClass);
            } else { // Fallback if specific class for complex filter doesn't exist
                video.classList.add('filter-none'); // or handle more gracefully
            }
        } else {
            currentVideoFilterClass = 'filter-none';
            const videoClassList = Array.from(video.classList).filter(cls => cls.startsWith('filter-'));
            videoClassList.forEach(cls => video.classList.remove(cls));
            video.classList.add(currentVideoFilterClass);
        }
    }

    function capturePictureWithTimestampOnly() {
        captureCanvas.width = video.videoWidth;
        captureCanvas.height = video.videoHeight;
        const cw = captureCanvas.width; const ch = captureCanvas.height;
        captureContext.filter = 'none';
        captureContext.drawImage(video, 0, 0, cw, ch);
        const now = new Date();
        const timestampText = `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${String(now.getFullYear()).slice(-2)} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        const textFont = 'bold 16px "Courier Prime", monospace';
        captureContext.font = textFont;
        captureContext.textAlign = 'right'; 
        captureContext.textBaseline = 'alphabetic'; 
        const textMetrics = captureContext.measureText(timestampText);
        const textPadding = 12; const textBgHeight = 28;
        captureContext.fillStyle = 'rgba(50, 50, 50, 0.65)';
        captureContext.fillRect(cw - textMetrics.width - textPadding * 1.5, ch - textBgHeight - textPadding / 2, textMetrics.width + textPadding * 1.5, textBgHeight);
        captureContext.fillStyle = 'rgba(247, 241, 233, 0.95)';
        captureContext.fillText(timestampText, cw - textPadding, ch - textPadding);
        return captureCanvas.toDataURL('image/jpeg', 0.92);
    }

    async function takePictureSequence() {
        const numPictures = parseInt(numPicturesInput.value);
        if (numPictures < 1 || numPictures > 6) { alert("Please choose between 1 and 6 pictures."); return; }
        captureButton.disabled = true; downloadCollageButton.disabled = true;
        deactivatePhotoEditing();
        photoStrip.innerHTML = '';
        for (let i = 0; i < numPictures; i++) {
            countdownMessage.textContent = `Snap ${i + 1}...`;
            const appContainer = document.querySelector('.app-container');
            if(appContainer) appContainer.style.boxShadow = '0 0 35px 20px #fff'; 
            setTimeout(() => { if(appContainer) appContainer.style.boxShadow = ''; }, 180);
            await new Promise(resolve => setTimeout(resolve, 1300));
            const timestampedSrc = capturePictureWithTimestampOnly();
            const captureFilter = captureFilterSelect.value;
            const captureSticker = defaultCaptureEmoji; 
            const captureStickerPosition = defaultCaptureStickerPosition;
            displayCapturedPhoto(timestampedSrc, captureFilter, captureSticker, captureStickerPosition);
        }
        countdownMessage.textContent = "Strip developed! Click a photo to edit.";
        setTimeout(() => { countdownMessage.textContent = ""; }, 4000);
        captureButton.disabled = false; downloadCollageButton.disabled = false;
    }

    function displayCapturedPhoto(timestampedSrc, captureFilter, captureSticker, captureStickerPosition) {
        const frameDiv = document.createElement('div');
        frameDiv.classList.add('photo-frame');
        const img = document.createElement('img');
        img.dataset.timestampedSrc = timestampedSrc;
        img.dataset.captureFilter = captureFilter;
        img.dataset.captureSticker = (captureSticker && captureSticker !== 'none') ? captureSticker : 'none';
        img.dataset.captureStickerPosition = (captureStickerPosition && captureStickerPosition !== 'none') ? captureStickerPosition : 'none';
        img.dataset.currentEditFilter = captureFilter; // Initialize edit filter
        // Initial sticker state for editing is the capture sticker state
        img.dataset.sticker = img.dataset.captureSticker;
        img.dataset.stickerPosition = img.dataset.captureStickerPosition;
        applyFilterAndStickerToImage(img, captureFilter, captureSticker, captureStickerPosition); 
        frameDiv.appendChild(img);
        photoStrip.appendChild(frameDiv);
    }

    function handlePhotoFrameClick(event) {
        const frame = event.target.closest('.photo-frame');
        if (!frame) return;
        const imgToEdit = frame.querySelector('img');
        if (!imgToEdit) return;
        if (activePhotoForEditing && activePhotoForEditing !== imgToEdit) {
            activePhotoForEditing.closest('.photo-frame').classList.remove('active-photo-edit');
        }
        activePhotoForEditing = imgToEdit;
        frame.classList.add('active-photo-edit');
        activatePhotoEditingUI(imgToEdit);
    }
    
    function activatePhotoEditingUI(imgElement) {
        editPhotoSection.style.display = 'block';
        editFilterSelect.value = imgElement.dataset.currentEditFilter;
        currentEditEmoji = imgElement.dataset.sticker !== 'none' ? imgElement.dataset.sticker : null;
        currentEditStickerPosition = imgElement.dataset.stickerPosition !== 'none' ? imgElement.dataset.stickerPosition : 'none';
        editStickerPositionSelect.value = currentEditStickerPosition;

        editStickerPalette.querySelectorAll('.active-edit-sticker').forEach(el => el.classList.remove('active-edit-sticker'));
        if (currentEditEmoji) {
            const stickerEl = Array.from(editStickerPalette.children).find(el => el.textContent === currentEditEmoji);
            if (stickerEl) {
                stickerEl.classList.add('active-edit-sticker');
                currentEditStickerPaletteElement = stickerEl;
            }
        } else {
            currentEditStickerPaletteElement = null;
        }
    }

    function deactivatePhotoEditing() {
        if (activePhotoForEditing) {
            activePhotoForEditing.closest('.photo-frame').classList.remove('active-photo-edit');
        }
        activePhotoForEditing = null;
        editPhotoSection.style.display = 'none';
    }

    function renderActivePhotoWithEdits() {
        if (!activePhotoForEditing) return;
        const newFilter = editFilterSelect.value;
        // currentEditEmoji and currentEditStickerPosition are updated by their respective control event listeners
        applyFilterAndStickerToImage(activePhotoForEditing, newFilter, currentEditEmoji, currentEditStickerPosition);
        activePhotoForEditing.dataset.currentEditFilter = newFilter; // Persist the chosen edit filter
    }

    function applyFilterAndStickerToImage(imgElement, filterValue, stickerValue, stickerPositionValue) {
        const baseSrc = imgElement.dataset.timestampedSrc;
        if (!baseSrc) { console.error("Base source not found for image", imgElement); return; }
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        const imageToProcess = new Image();
        imageToProcess.onload = () => {
            tempCanvas.width = imageToProcess.naturalWidth;
            tempCanvas.height = imageToProcess.naturalHeight;
            const cw = tempCanvas.width; const ch = tempCanvas.height;
            tempCtx.filter = filterValue || 'none';
            tempCtx.drawImage(imageToProcess, 0, 0, cw, ch);
            tempCtx.filter = 'none'; 
            if (stickerValue && stickerValue !== 'none' && stickerPositionValue && stickerPositionValue !== 'none') {
                tempCtx.font = `${EMOJI_FONT_SIZE_ON_CANVAS}px sans-serif`;
                let x, y;
                switch (stickerPositionValue) {
                    case 'top-left':     tempCtx.textAlign = 'left';   tempCtx.textBaseline = 'top';    x = STICKER_PADDING_CANVAS;          y = STICKER_PADDING_CANVAS; break;
                    case 'top-right':    tempCtx.textAlign = 'right';  tempCtx.textBaseline = 'top';    x = cw - STICKER_PADDING_CANVAS;     y = STICKER_PADDING_CANVAS; break;
                    case 'bottom-left':  tempCtx.textAlign = 'left';   tempCtx.textBaseline = 'bottom'; x = STICKER_PADDING_CANVAS;          y = ch - STICKER_PADDING_CANVAS; break;
                    case 'bottom-right': tempCtx.textAlign = 'right';  tempCtx.textBaseline = 'bottom'; x = cw - STICKER_PADDING_CANVAS;     y = ch - STICKER_PADDING_CANVAS; break;
                    case 'center':       tempCtx.textAlign = 'center'; tempCtx.textBaseline = 'middle'; x = cw / 2;                          y = ch / 2; break;
                    default: x = cw/2; y = ch/2; break;
                }
                tempCtx.fillText(stickerValue, x, y);
            }
            imgElement.src = tempCanvas.toDataURL('image/png');
            imgElement.dataset.sticker = (stickerValue && stickerValue !== 'none') ? stickerValue : 'none';
            imgElement.dataset.stickerPosition = (stickerPositionValue && stickerPositionValue !== 'none') ? stickerPositionValue : 'none';
        };
        imageToProcess.onerror = () => console.error("Error loading image for filter/sticker application.");
        imageToProcess.src = baseSrc;
    }

    function updateCollageLayout(layoutValue) {
        photoStrip.className = 'photo-strip';
        if (layoutValue === 'horizontal') photoStrip.classList.add('layout-horizontal');
        else if (layoutValue === 'grid2xN') photoStrip.classList.add('layout-grid2xN');
    }
    function downloadPhotoStrip() {
        if (!photoStrip.querySelector('img')) { alert("Take some photos first!"); return; }
        countdownMessage.textContent = "Preparing your masterpiece...";
        downloadCollageButton.disabled = true;
        deactivatePhotoEditing(); // Ensure no photo is "active" visually during download

        setTimeout(() => {
            html2canvas(outputGallery, {
                backgroundColor: collageBgColorInput.value, scale: 2.5,
                useCORS: true, logging: false, allowTaint: true,
                onclone: (docClone) => {
                    const clonedPS = docClone.getElementById('photo-strip');
                    if(clonedPS) {
                        clonedPS.className = 'photo-strip';
                        const currentLayout = collageLayoutSelect.value;
                        if (currentLayout === 'horizontal') clonedPS.classList.add('layout-horizontal');
                        else if (currentLayout === 'grid2xN') clonedPS.classList.add('layout-grid2xN');
                        // Remove active photo class from clone to prevent dashed border in download
                        const activeCloneFrame = clonedPS.querySelector('.active-photo-edit');
                        if(activeCloneFrame) activeCloneFrame.classList.remove('active-photo-edit');
                    }
                }
            }).then(canvas => {
                const imageURL = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = imageURL;
                const layoutName = collageLayoutSelect.options[collageLayoutSelect.selectedIndex].text.toLowerCase().replace(/\s+/g, '-');
                link.download = `artisansnap-${layoutName}-${Date.now()}.png`;
                document.body.appendChild(link); link.click(); document.body.removeChild(link);
                countdownMessage.textContent = "Strip Downloaded!";
            }).catch(err => {
                console.error("Error generating strip:", err);
                alert("Oops! Could not generate the strip. See console for details.");
                countdownMessage.textContent = "Download Failed.";
            }).finally(() => {
                downloadCollageButton.disabled = false;
                setTimeout(() => { countdownMessage.textContent = ""; }, 3000);
            });
        }, 250);
    }

    // --- Start the application ---
    initWebcam();
    populateControlDropdowns();
    populateStickerPalettes();
    outputGallery.style.backgroundColor = collageBgColorInput.value;
    updateCollageLayout(collageLayoutSelect.value);
    defaultCaptureStickerPosition = captureStickerPositionSelect.value;
    currentEditStickerPosition = editStickerPositionSelect.value;
});
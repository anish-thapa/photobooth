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
    
    // Capture Settings Elements
    const captureFilterSelect = document.getElementById('capture-filter-select');
    const captureStickerPalette = document.getElementById('capture-sticker-palette');
    const captureStickerPositionSelect = document.getElementById('capture-sticker-position-select');

    // Edit Controls Elements
    const editPhotoSection = document.getElementById('edit-photo-section');
    const editFilterSelect = document.getElementById('edit-filter-select');
    const editStickerPalette = document.getElementById('edit-sticker-palette');
    const editStickerPositionSelect = document.getElementById('edit-sticker-position-select');
    const clearEditsButton = document.getElementById('clear-edits-button');

    const captureContext = captureCanvas.getContext('2d');

    // --- State Variables ---
    let stream;
    let currentVideoFilterClass = 'filter-none'; // For CSS class on video preview
    
    // For pre-capture defaults
    let defaultCaptureEmoji = null;
    let defaultCaptureEmojiElement = null; // HTML element in capture palette
    let defaultCaptureStickerPosition = 'none';

    // For post-capture editing
    let activePhotoForEditing = null; // The <img> element being edited
    let currentEditEmoji = null; 
    let currentEditStickerPaletteElement = null; // HTML element in edit palette
    let currentEditStickerPosition = 'none'; 

    const emojiStickersArray = ["😀", "😂", "😍", "🥳", "😎", "😭", "👍", "❤️", "🔥", "❤️‍🔥", "⭐", "🎉", "🍕", "👑", "🚀", "💡", "💯", "✨", "👀", "👻", "👽", "🤖", "💼", "🎩", "🕶️", "💬", "💀", "🎞️"];
    const EMOJI_FONT_SIZE_ON_CANVAS = 52;
    const STICKER_PADDING_CANVAS = 25;

    // --- Initialization ---
    async function initWebcam() {
        try {
            // Request camera with ideal constraints, but allow flexibility
            const constraints = { 
                video: { 
                    facingMode: 'user',
                    // Optional: Request specific resolutions, but browser may override
                    // width: { ideal: 1280 }, 
                    // height: { ideal: 720 } 
                }, 
                audio: false 
            };
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            // 'loadedmetadata' event ensures video dimensions are available
            video.onloadedmetadata = () => {
                console.log(`Webcam resolution: ${video.videoWidth}x${video.videoHeight}`);
                applyVideoFilterPreview(captureFilterSelect.value); // Apply initial filter once metadata is loaded
                captureButton.disabled = false;
            };
        } catch (err) {
            console.error("Error accessing webcam:", err);
            countdownMessage.textContent = "Webcam Error. Check permissions.";
            captureButton.disabled = true;
        }
    }

    function populateControlDropdowns() {
        editFilterSelect.innerHTML = ''; // Clear just in case
        Array.from(captureFilterSelect.options).forEach(optionNode => {
            editFilterSelect.add(optionNode.cloneNode(true));
        });
    }

    function populateStickerPalettes() {
        // Populate Capture Sticker Palette
        captureStickerPalette.innerHTML = '';
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
                } else {
                    defaultCaptureEmoji = emojiChar;
                    defaultCaptureEmojiElement = stickerSpan;
                    stickerSpan.classList.add('active-capture-sticker');
                    if (captureStickerPositionSelect.value === "none") {
                         captureStickerPositionSelect.value = "top-right";
                         defaultCaptureStickerPosition = "top-right";
                    }
                }
            });
            captureStickerPalette.appendChild(stickerSpan);
        });

        // Populate Edit Sticker Palette
        editStickerPalette.innerHTML = '';
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
                     if (editStickerPositionSelect.value === "none") {
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
            activatePhotoEditingUI(activePhotoForEditing);
        }
    });

    photoStrip.addEventListener('click', handlePhotoFrameClick);

    // --- Core Functions ---
    function applyVideoFilterPreview(selectedFilterValue) {
        const filterClasses = Array.from(video.classList).filter(cls => cls.startsWith('filter-'));
        filterClasses.forEach(cls => video.classList.remove(cls));

        video.style.filter = selectedFilterValue; // Always apply direct style

        const selectedOption = captureFilterSelect.querySelector(`option[value="${CSS.escape(selectedFilterValue)}"]`);
        let cssClassToAdd = 'filter-none'; // Default
        if (selectedOption) {
            const dataClass = selectedOption.dataset.cssClass;
            if (dataClass) {
                cssClassToAdd = dataClass;
            }
        }
        currentVideoFilterClass = cssClassToAdd; // Update state
        video.classList.add(cssClassToAdd);
        console.log("Applied video class:", cssClassToAdd, "for filter:", selectedFilterValue); // Debugging
    }


    function capturePictureWithTimestampOnly() {
        captureCanvas.width = video.videoWidth;
        captureCanvas.height = video.videoHeight;
        if (captureCanvas.width === 0 || captureCanvas.height === 0) {
            console.warn("Video dimensions not ready for capture.");
            // Maybe use fallback dimensions or wait? For now, let it proceed.
            captureCanvas.width = 640; // Fallback example
            captureCanvas.height = 480;
        }

        const cw = captureCanvas.width; const ch = captureCanvas.height;
        captureContext.filter = 'none';
        try {
            captureContext.drawImage(video, 0, 0, cw, ch);
        } catch (e) {
            console.error("Error drawing video to canvas:", e);
            // Optionally draw a placeholder if drawImage fails
            captureContext.fillStyle = '#ccc';
            captureContext.fillRect(0,0,cw,ch);
            captureContext.fillStyle = '#000';
            captureContext.fillText("Capture Error", 10, 20);
        }

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
            const filterForThisSnap = captureFilterSelect.value;
            const stickerForThisSnap = defaultCaptureEmoji;
            const stickerPositionForThisSnap = defaultCaptureStickerPosition;
            displayCapturedPhoto(timestampedSrc, filterForThisSnap, stickerForThisSnap, stickerPositionForThisSnap);
        }
        countdownMessage.textContent = "Strip developed! Click a photo to edit.";
        setTimeout(() => { countdownMessage.textContent = ""; }, 4000);
        captureButton.disabled = false; downloadCollageButton.disabled = false;
    }

    function displayCapturedPhoto(timestampedSrc, initialFilter, initialSticker, initialStickerPosition) {
        const frameDiv = document.createElement('div');
        frameDiv.classList.add('photo-frame');
        const img = document.createElement('img');
        img.dataset.timestampedSrc = timestampedSrc;
        img.dataset.captureFilter = initialFilter;
        img.dataset.captureSticker = (initialSticker && initialSticker !== 'none') ? initialSticker : 'none';
        img.dataset.captureStickerPosition = (initialStickerPosition && initialStickerPosition !== 'none') ? initialStickerPosition : 'none';
        img.dataset.currentEditFilter = initialFilter;
        img.dataset.sticker = img.dataset.captureSticker;
        img.dataset.stickerPosition = img.dataset.captureStickerPosition;
        applyFilterAndStickerToImage(img, initialFilter, initialSticker, initialStickerPosition);
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
        if (!imgElement || !imgElement.dataset) {
             console.error("Invalid image element passed to activatePhotoEditingUI");
             return;
        }
        editPhotoSection.style.display = 'block';
        editFilterSelect.value = imgElement.dataset.currentEditFilter || 'none'; // Fallback to 'none'
        currentEditEmoji = imgElement.dataset.sticker !== 'none' ? imgElement.dataset.sticker : null;
        currentEditStickerPosition = imgElement.dataset.stickerPosition !== 'none' ? imgElement.dataset.stickerPosition : 'none';
        editStickerPositionSelect.value = currentEditStickerPosition;

        editStickerPalette.querySelectorAll('.active-edit-sticker').forEach(el => el.classList.remove('active-edit-sticker'));
        currentEditStickerPaletteElement = null; // Reset before finding
        if (currentEditEmoji) {
            const stickerEl = Array.from(editStickerPalette.children).find(el => el.textContent === currentEditEmoji);
            if (stickerEl) {
                stickerEl.classList.add('active-edit-sticker');
                currentEditStickerPaletteElement = stickerEl;
            }
        }
    }

    function deactivatePhotoEditing() {
        if (activePhotoForEditing) {
            activePhotoForEditing.closest('.photo-frame').classList.remove('active-photo-edit');
        }
        activePhotoForEditing = null;
        editPhotoSection.style.display = 'none';
        // Optionally reset edit controls here if desired when deselecting
        // editFilterSelect.value = 'none';
        // editStickerPositionSelect.value = 'none';
        // if (currentEditStickerPaletteElement) currentEditStickerPaletteElement.classList.remove('active-edit-sticker');
        // currentEditEmoji = null; currentEditStickerPaletteElement = null; currentEditStickerPosition = 'none';
    }

    function renderActivePhotoWithEdits() {
        if (!activePhotoForEditing) return;
        const newFilter = editFilterSelect.value;
        applyFilterAndStickerToImage(activePhotoForEditing, newFilter, currentEditEmoji, currentEditStickerPosition);
        activePhotoForEditing.dataset.currentEditFilter = newFilter; // Persist selection
    }

    function applyFilterAndStickerToImage(imgElement, filterToApply, stickerToApply, stickerPositionToApply) {
        const baseSrc = imgElement.dataset.timestampedSrc;
        if (!baseSrc) { console.error("Base source (timestampedSrc) not found for image", imgElement); return; }
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        const imageToProcess = new Image();
        imageToProcess.onload = () => {
            tempCanvas.width = imageToProcess.naturalWidth;
            tempCanvas.height = imageToProcess.naturalHeight;
            const cw = tempCanvas.width; const ch = tempCanvas.height;
            tempCtx.filter = filterToApply || 'none';
            tempCtx.drawImage(imageToProcess, 0, 0, cw, ch);
            tempCtx.filter = 'none';
            if (stickerToApply && stickerToApply !== 'none' && stickerPositionToApply && stickerPositionToApply !== 'none') {
                tempCtx.font = `${EMOJI_FONT_SIZE_ON_CANVAS}px sans-serif`;
                let x, y;
                switch (stickerPositionToApply) {
                    case 'top-left':     tempCtx.textAlign = 'left';   tempCtx.textBaseline = 'top';    x = STICKER_PADDING_CANVAS;          y = STICKER_PADDING_CANVAS; break;
                    case 'top-right':    tempCtx.textAlign = 'right';  tempCtx.textBaseline = 'top';    x = cw - STICKER_PADDING_CANVAS;     y = STICKER_PADDING_CANVAS; break;
                    case 'bottom-left':  tempCtx.textAlign = 'left';   tempCtx.textBaseline = 'bottom'; x = STICKER_PADDING_CANVAS;          y = ch - STICKER_PADDING_CANVAS; break;
                    case 'bottom-right': tempCtx.textAlign = 'right';  tempCtx.textBaseline = 'bottom'; x = cw - STICKER_PADDING_CANVAS;     y = ch - STICKER_PADDING_CANVAS; break;
                    case 'center':       tempCtx.textAlign = 'center'; tempCtx.textBaseline = 'middle'; x = cw / 2;                          y = ch / 2; break;
                    default:             tempCtx.textAlign = 'center'; tempCtx.textBaseline = 'middle'; x = cw/2; y = ch/2; break; // Center fallback
                }
                try { // Add try-catch for potential font/emoji issues
                    tempCtx.fillText(stickerToApply, x, y);
                } catch (e) {
                    console.error("Error drawing sticker:", e, stickerToApply);
                }
            }
            imgElement.src = tempCanvas.toDataURL('image/png');
            imgElement.dataset.sticker = (stickerToApply && stickerToApply !== 'none') ? stickerToApply : 'none';
            imgElement.dataset.stickerPosition = (stickerPositionToApply && stickerPositionToApply !== 'none') ? stickerPositionToApply : 'none';
        };
        imageToProcess.onerror = () => console.error("Error loading image for filter/sticker application. BaseSrc:", baseSrc.substring(0, 100)); // Log start of baseSrc
        imageToProcess.src = baseSrc;
    }

    function updateCollageLayout(layoutValue) {
        photoStrip.className = 'photo-strip'; // Reset
        if (layoutValue === 'horizontal') photoStrip.classList.add('layout-horizontal');
        else if (layoutValue === 'grid2xN') photoStrip.classList.add('layout-grid2xN');
    }
    
    function downloadPhotoStrip() {
        if (!photoStrip.querySelector('img')) { alert("Take some photos first!"); return; }
        countdownMessage.textContent = "Preparing your masterpiece...";
        downloadCollageButton.disabled = true;
        deactivatePhotoEditing(); 

        setTimeout(() => {
            html2canvas(outputGallery, {
                backgroundColor: collageBgColorInput.value, scale: 2.5,
                useCORS: true, logging: false, allowTaint: true, // allowTaint might help dataURLs
                onclone: (docClone) => {
                    const clonedPS = docClone.getElementById('photo-strip');
                    if(clonedPS) {
                        clonedPS.className = 'photo-strip';
                        const currentLayout = collageLayoutSelect.value;
                        if (currentLayout === 'horizontal') clonedPS.classList.add('layout-horizontal');
                        else if (currentLayout === 'grid2xN') clonedPS.classList.add('layout-grid2xN');
                        // Remove active state from clone if necessary
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
        }, 300); // Increased delay slightly just in case
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

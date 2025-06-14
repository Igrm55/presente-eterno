document.addEventListener('DOMContentLoaded', () => {
    
    const form = document.getElementById('creation-form');
    const formContent = document.getElementById('form-content');
    const finalMessageContainer = document.getElementById('final-message');
    const formSteps = Array.from(document.querySelectorAll('.form-step'));
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const submitBtn = document.getElementById('submit-btn');
    const progressBar = document.getElementById('progress-bar');
    const packageOptions = document.querySelectorAll('input[name="pacote_escolhido"]');

    const addPhotoBtn = document.getElementById('add-photo-btn');
    const fotosInput = document.getElementById('fotos-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const photoValidationInput = document.getElementById('photo-validation-input');
    let selectedImageFiles = [];

    const recordBtn = document.getElementById('record-btn');
    const stopRecordBtn = document.getElementById('stop-record-btn');
    const recordStatus = document.getElementById('record-status');
    const audioInput = document.getElementById('audio-input');
    const audioUploadStatus = document.getElementById('audio-upload-status');
    const audioPlaybackElement = document.getElementById('audio-playback-element');
    const customAudioPlayer = document.getElementById('custom-audio-player');
    const playerPlayBtn = document.getElementById('player-play-btn');
    const playerSeekBar = document.getElementById('player-seek-bar');
    const playerCurrentTime = document.getElementById('player-current-time');
    const playerDuration = document.getElementById('player-duration');
    let mediaRecorder;
    let audioChunks = [];
    let audioFileToSubmit = null;
    
    const linkAudioHidden = document.getElementById('link_audio_hidden');
    const uploadProgressContainer = document.getElementById('upload-progress-container');
    const uploadProgressText = document.getElementById('upload-progress-text');

    let currentStepIndex = 0;
    let visibleSteps = [];
    
    function filterVisibleSteps() {
        const selectedPackageRadio = document.querySelector('input[name="pacote_escolhido"]:checked');
        if (!selectedPackageRadio) {
            visibleSteps = [formSteps[0]];
            return;
        }
        const selectedPackageValue = selectedPackageRadio.id; 
        
        visibleSteps = [formSteps[0]];
        formSteps.forEach(step => {
            const packages = step.dataset.packages;
            const isFinalStep = step.dataset.stepName === 'Enviar';
            if (packages && packages.split(',').includes(selectedPackageValue) && !isFinalStep) {
                visibleSteps.push(step);
            }
        });
        visibleSteps.push(formSteps.find(step => step.dataset.stepName === 'Enviar'));
        updateProgressBar();
    }

    function updateProgressBar() {
        progressBar.innerHTML = '';
        visibleSteps.forEach((step, index) => {
            const stepName = step.dataset.stepName;
            const li = document.createElement('li');
            li.className = 'step';
            li.innerHTML = `<span class="dot"></span> ${stepName}`;
            progressBar.appendChild(li);
        });
        const progressLine = document.createElement('div');
        progressLine.id = 'progress-line';
        progressBar.appendChild(progressLine);
        updateProgressClasses();
    }

    function updateProgressClasses() {
        const progressSteps = progressBar.querySelectorAll('.step');
        const progressLine = document.getElementById('progress-line');
        progressSteps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index < currentStepIndex) step.classList.add('completed');
            else if (index === currentStepIndex) step.classList.add('active');
        });
        
        if (progressLine) {
             const activeStep = progressBar.querySelector('.step.active');
            if (activeStep) {
                const totalSteps = progressSteps.length;
                const activeIndex = Array.from(progressSteps).indexOf(activeStep);
                const widthPercentage = totalSteps > 1 ? (activeIndex / (totalSteps - 1)) * 100 : 0;
                progressLine.style.width = `${widthPercentage}%`;
            }
        }
    }

    function showStep(stepIndex) {
        formSteps.forEach(step => step.classList.remove('active'));
        if(visibleSteps[stepIndex]) {
             visibleSteps[stepIndex].classList.add('active');
        }
        updateButtonVisibility();
        updateProgressClasses();
    }

    function updateButtonVisibility() {
        prevBtn.classList.toggle('hidden', currentStepIndex === 0);
        nextBtn.classList.toggle('hidden', currentStepIndex === visibleSteps.length - 1);
        submitBtn.classList.toggle('hidden', currentStepIndex !== visibleSteps.length - 1);
    }

    function validateCurrentStep() {
        const currentStep = visibleSteps[currentStepIndex];
        if (!currentStep) return false;
        
        if (currentStep.dataset.stepName === 'Memórias') {
             if (selectedImageFiles.length === 0) {
                 showAlert('Fotos Obrigatórias', 'Por favor, adicione pelo menos uma foto.');
                 return false;
             }
        }
        
        if (currentStep.dataset.stepName === 'Sinfonia') {
            if (!audioFileToSubmit && audioInput.files.length === 0) {
                showAlert('Áudio Obrigatório', 'Por favor, grave ou envie um ficheiro de áudio para este pacote.');
                return false;
            }
        }

        const inputs = currentStep.querySelectorAll('[required]');
        for (const input of inputs) {
             if (!input.value.trim()) {
                 const group = input.closest('.form-group');
                 const label = group ? group.querySelector('label') : null;
                 const labelText = label ? `"${label.textContent}"` : 'um campo obrigatório';
                 if(label) label.style.color = '#FF4D4D';
                 showAlert('Campo Obrigatório', `Por favor, preencha ${labelText}.`);
                 return false;
             } else {
                 const group = input.closest('.form-group');
                 const label = group ? group.querySelector('label') : null;
                 if(label) label.style.color = '';
             }
        }
        return true;
    }

    packageOptions.forEach(option => {
        option.addEventListener('change', () => {
            currentStepIndex = 0;
            filterVisibleSteps();
            showStep(currentStepIndex); 
        });
    });

    nextBtn.addEventListener('click', () => {
        if (validateCurrentStep()) {
            currentStepIndex++;
            showStep(currentStepIndex);
        } else {
             if (!document.querySelector('input[name="pacote_escolhido"]:checked')) {
                showAlert('Campo Obrigatório', 'Por favor, selecione um pacote para continuar.');
            }
        }
    });

    prevBtn.addEventListener('click', () => {
        if(currentStepIndex > 0) {
            currentStepIndex--;
            showStep(currentStepIndex);
        }
    });

    addPhotoBtn.addEventListener('click', () => fotosInput.click());

    fotosInput.addEventListener('change', (event) => {
        const files = Array.from(event.target.files);
        selectedImageFiles.push(...files);
        renderImagePreviews();
        fotosInput.value = '';
    });

    function renderImagePreviews() {
        imagePreviewContainer.innerHTML = '';
        selectedImageFiles.forEach((file, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';

            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-image-btn';
            removeBtn.innerHTML = '&times;';
            
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedImageFiles.splice(index, 1);
                renderImagePreviews();
            });

            previewItem.appendChild(img);
            previewItem.appendChild(removeBtn);
            imagePreviewContainer.appendChild(previewItem);
        });
        photoValidationInput.value = selectedImageFiles.length > 0 ? 'valid' : '';
    }
    
    function setAudioSource(file, sourceName) {
        if (!file) {
            audioFileToSubmit = null;
            audioPlaybackElement.removeAttribute('src');
            customAudioPlayer.classList.add('hidden');
            audioUploadStatus.textContent = '';
            return;
        }
        audioFileToSubmit = file;
        const audioUrl = URL.createObjectURL(file);
        audioPlaybackElement.src = audioUrl;
        audioUploadStatus.textContent = `Áudio selecionado: ${sourceName}`;
        customAudioPlayer.classList.remove('hidden');
    }

    recordBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            
            mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
            
            mediaRecorder.onstart = () => {
                audioChunks = [];
                setAudioSource(null); 
                recordStatus.innerHTML = '<span class="recording-dot"></span>Gravando...';
                recordStatus.classList.remove('hidden');
                recordBtn.classList.add('hidden');
                stopRecordBtn.classList.remove('hidden');
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const file = new File([audioBlob], `gravacao_${Date.now()}.webm`, { type: 'audio/webm' });
                setAudioSource(file, 'Áudio gravado');
                
                recordStatus.textContent = 'Gravação concluída. Ouça abaixo.';
                stopRecordBtn.classList.add('hidden');
                recordBtn.classList.remove('hidden');
            };
            mediaRecorder.start();
        } catch (err) {
            showAlert("Erro de Microfone", "Não foi possível aceder ao seu microfone. Verifique as permissões.");
        }
    });

    stopRecordBtn.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
    });

    audioInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            setAudioSource(file, file.name);
            recordStatus.classList.add('hidden');
        }
    });
    
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    playerPlayBtn.addEventListener('click', () => {
        if (audioPlaybackElement.paused) {
            audioPlaybackElement.play();
            playerPlayBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            audioPlaybackElement.pause();
            playerPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    });

    audioPlaybackElement.addEventListener('timeupdate', () => {
        if (audioPlaybackElement.duration) {
            const progressPercent = (audioPlaybackElement.currentTime / audioPlaybackElement.duration) * 100;
            playerSeekBar.style.setProperty('--seek-before-width', `${progressPercent}%`);
            playerSeekBar.value = audioPlaybackElement.currentTime;
            playerCurrentTime.textContent = formatTime(audioPlaybackElement.currentTime);
        }
    });

    audioPlaybackElement.addEventListener('loadedmetadata', () => {
        playerSeekBar.max = audioPlaybackElement.duration;
        playerDuration.textContent = formatTime(audioPlaybackElement.duration);
    });
    
    audioPlaybackElement.addEventListener('ended', () => {
         playerPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
         playerSeekBar.value = 0;
         playerSeekBar.style.setProperty('--seek-before-width', `0%`);
    });

    playerSeekBar.addEventListener('input', () => {
        audioPlaybackElement.currentTime = playerSeekBar.value;
    });
    
    async function handleFormSubmit(event) {
        event.preventDefault();
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'A Enviar... <i class="fas fa-spinner fa-spin"></i>';
        uploadProgressContainer.classList.remove('hidden');

        const audioFile = audioFileToSubmit || audioInput.files[0];

        try {
            // 1. Envia o áudio primeiro para obter o link, se existir
            if (audioFile) {
                uploadProgressText.textContent = 'A enviar o ficheiro de áudio...';
                const audioFormData = new FormData();
                audioFormData.append('file', audioFile);

                const response = await fetch('https://file.io/?expires=1d', {
                    method: 'POST',
                    body: audioFormData,
                });
                const data = await response.json();

                if (data.success) {
                    linkAudioHidden.value = data.link;
                } else {
                    throw new Error('Falha no upload do áudio: ' + (data.message || 'Erro desconhecido.'));
                }
            }

            // 2. Envia o formulário principal com as fotos e o link do áudio
            uploadProgressText.textContent = 'A enviar fotos e dados...';
            
            const mainFormData = new FormData(form);
            mainFormData.delete('fotos'); // Limpa para evitar duplicados

            selectedImageFiles.forEach(file => {
                mainFormData.append('fotos', file, file.name);
            });
            
            const finalResponse = await fetch(form.action, {
                method: 'POST',
                body: mainFormData,
            });

            if (finalResponse.ok) {
                showFinalMessage(true);
            } else {
                const errorResult = await finalResponse.json();
                throw new Error(errorResult.message || 'Erro desconhecido no servidor.');
            }

        } catch (error) {
            showFinalMessage(false, `Ocorreu um erro: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Enviar Pedido';
            uploadProgressContainer.classList.add('hidden');
        }
    }

    function showFinalMessage(success, message = '') {
        formContent.classList.add('hidden');
        finalMessageContainer.classList.remove('hidden');
        if (success) {
            finalMessageContainer.innerHTML = `
                <i class="fas fa-check-circle success"></i>
                <h2>Enviado com Sucesso!</h2>
                <p>As suas informações foram recebidas. Em breve, entrarei em contacto. Obrigado!</p>`;
        } else {
            finalMessageContainer.innerHTML = `
                <i class="fas fa-times-circle error"></i>
                <h2>Ocorreu um Erro</h2>
                <p>Não foi possível enviar as suas informações. Detalhe: ${message}</p>`;
        }
    }
    
    function showAlert(title, message) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        document.getElementById('alert-modal').classList.add('visible');
    }

    const modalOverlay = document.getElementById('alert-modal');
    const modalCloseBtn = document.getElementById('modal-close');
    
    modalCloseBtn.addEventListener('click', () => modalOverlay.classList.remove('visible'));
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) modalOverlay.classList.remove('visible');
    });
    
    filterVisibleSteps();
    showStep(currentStepIndex);
});
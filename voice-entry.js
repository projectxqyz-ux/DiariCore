// Voice Entry JavaScript
document.addEventListener('DOMContentLoaded', function() {
    let isRecording = false;
    let mediaRecorder;
    let audioChunks = [];
    let startTime;
    let timerInterval;
    
    const voiceCircle = document.getElementById('voiceCircle');
    const micIcon = document.getElementById('micIcon');
    const statusText = document.getElementById('statusText');
    const instructionText = document.getElementById('instructionText');
    const voiceTimer = document.getElementById('voiceTimer');
    const voiceTranscript = document.getElementById('voiceTranscript');
    const transcriptText = document.getElementById('transcriptText');
    const clearBtn = document.getElementById('clearBtn');
    const saveBtn = document.getElementById('saveBtn');
    
    // Sidebar functionality
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
    });
    
    // Voice recording functionality
    voiceCircle.addEventListener('click', function() {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    });
    
    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = function(event) {
                audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = function() {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                processAudio(audioBlob);
            };
            
            mediaRecorder.start();
            isRecording = true;
            startTime = Date.now();
            
            // Update UI
            voiceCircle.classList.add('recording');
            micIcon.className = 'bi bi-stop-fill';
            statusText.textContent = 'Recording...';
            instructionText.textContent = 'Click the button to stop recording';
            voiceTranscript.classList.add('active');
            
            // Start timer
            timerInterval = setInterval(updateTimer, 100);
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            statusText.textContent = 'Microphone access denied';
            instructionText.textContent = 'Please allow microphone access to use voice entry';
        }
    }
    
    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        
        isRecording = false;
        clearInterval(timerInterval);
        
        // Update UI
        voiceCircle.classList.remove('recording');
        micIcon.className = 'bi bi-mic';
        statusText.textContent = 'Processing...';
        instructionText.textContent = 'Converting speech to text...';
        
        // Enable buttons
        setTimeout(() => {
            clearBtn.disabled = false;
            saveBtn.disabled = false;
            statusText.textContent = 'Recording complete';
            instructionText.textContent = 'You can save this entry or record again';
        }, 2000);
    }
    
    function updateTimer() {
        const elapsed = Date.now() - startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        voiceTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    function processAudio(audioBlob) {
        // Simulate speech-to-text processing
        // In a real implementation, you would send this to a speech-to-text API
        setTimeout(() => {
            const simulatedTranscript = "This is a sample transcript of your voice entry. In a real implementation, this would be the actual text converted from your speech using a speech-to-text service like Google Speech-to-Text or Azure Speech Services.";
            transcriptText.textContent = simulatedTranscript;
        }, 1500);
    }
    
    // Clear button functionality
    clearBtn.addEventListener('click', function() {
        transcriptText.textContent = 'Your speech will appear here as you speak...';
        voiceTimer.textContent = '00:00';
        statusText.textContent = 'Tap to start recording';
        instructionText.textContent = 'Click the microphone button to begin voice recording';
        clearBtn.disabled = true;
        saveBtn.disabled = true;
        voiceTranscript.classList.remove('active');
    });
    
    // Save button functionality
    saveBtn.addEventListener('click', function() {
        const transcript = transcriptText.textContent;
        if (transcript && transcript !== 'Your speech will appear here as you speak...') {
            // Save to localStorage (placeholder)
            let entries = JSON.parse(localStorage.getItem('diariCoreEntries') || '[]');
            const entry = {
                id: Date.now(),
                type: 'voice',
                text: transcript,
                date: new Date().toISOString(),
                characterCount: transcript.length,
                audioData: 'audio_blob_data_placeholder' // In real implementation, you'd store the audio
            };
            entries.push(entry);
            localStorage.setItem('diariCoreEntries', JSON.stringify(entries));
            
            // Show success message
            statusText.textContent = 'Entry saved successfully!';
            instructionText.textContent = 'Your voice entry has been saved to your journal';
            
            // Redirect after delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        }
    });
});

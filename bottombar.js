(function() {
    'use strict';

    var LOVE = window.LOVE || {};
    var isVoiceMode = false;
    var voiceRecord = { isRecording: false, mediaRecorder: null, chunks: [], startTime: null, timerInterval: null, isCancelled: false, touchStartY: 0, pressTimer: null, isPress: false };

    var voiceBtn = document.getElementById('voice-mode-btn');
    var msgInput = document.getElementById('message-input');
    var sendBtn = document.getElementById('send-btn');
    var emojiBtn = document.getElementById('emoji-btn');
    var expandBtn = document.getElementById('expand-btn');
    var expandPanel = document.getElementById('expand-panel');
    var emojiDrawer = document.getElementById('emoji-drawer');
    var footer = document.getElementById('footer');

    if (!voiceBtn || !msgInput || !sendBtn || !emojiBtn || !expandBtn) return;

    function updateSendBtn() {
        if (isVoiceMode) { sendBtn.classList.add('hidden'); return; }
        sendBtn.classList.toggle('hidden', msgInput.value.trim().length === 0);
        msgInput.style.height = 'auto';
        msgInput.style.height = Math.min(msgInput.scrollHeight, 80) + 'px';
    }
    LOVE.updateSendBtn = updateSendBtn;
    msgInput.addEventListener('input', updateSendBtn);
    msgInput.addEventListener('compositionend', updateSendBtn);

    // ---- Keyboard handling (mobile: keep footer visible) ----
    function handleKeyboard(open) {
        document.body.classList.toggle('keyboard-open', open);
        if (open) {
            setTimeout(function() {
                var chatContainer = document.getElementById('chat-container');
                if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
            }, 350);
        }
    }
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', function() {
            var active = document.activeElement;
            if (active === msgInput || active === document.getElementById('emoji-btn') || active === document.getElementById('expand-btn')) {
                handleKeyboard(true);
            } else {
                handleKeyboard(false);
            }
        });
    }
    msgInput.addEventListener('focus', function() { handleKeyboard(true); });
    msgInput.addEventListener('blur', function() { handleKeyboard(false); });

    // ---- Voice overlay with "按住说话" visual ----
    var voiceOverlay = document.createElement('div');
    voiceOverlay.id = 'voice-overlay';
    voiceOverlay.innerHTML = '<i class="fa fa-microphone mr-1"></i>按住说话';
    msgInput.parentNode.appendChild(voiceOverlay);

    function updateVoiceOverlay() {
        voiceOverlay.classList.toggle('show', isVoiceMode);
        if (!isVoiceMode) stopRecording(true);
    }

    function onPressStart(y) {
        if (!isVoiceMode) return;
        voiceRecord.touchStartY = y;
        voiceRecord.pressTimer = setTimeout(function() {
            voiceRecord.isPress = true;
            if (!voiceRecord.isRecording) startRecording();
        }, 300);
    }
    function onPressMove(y) {
        if (!voiceRecord.isRecording) return;
        var dy = voiceRecord.touchStartY - y;
        var zone = document.getElementById('voice-cancel-zone');
        if (zone) {
            if (dy > 50) { zone.classList.add('show'); voiceRecord.isCancelled = true; }
            else { zone.classList.remove('show'); voiceRecord.isCancelled = false; }
        }
    }
    function onPressEnd() {
        clearTimeout(voiceRecord.pressTimer);
        if (voiceRecord.isRecording) stopRecording(voiceRecord.isCancelled);
        voiceRecord.isPress = false;
    }
    function onPressCancel() {
        clearTimeout(voiceRecord.pressTimer);
        if (voiceRecord.isRecording) stopRecording(true);
        voiceRecord.isPress = false;
    }

    voiceOverlay.addEventListener('mousedown', function(e) { onPressStart(e.clientY); });
    voiceOverlay.addEventListener('mousemove', function(e) { onPressMove(e.clientY); });
    voiceOverlay.addEventListener('mouseup', onPressEnd);
    voiceOverlay.addEventListener('mouseleave', function() { if (voiceRecord.isRecording) stopRecording(true); });

    voiceOverlay.addEventListener('touchstart', function(e) { onPressStart(e.touches[0].clientY); });
    voiceOverlay.addEventListener('touchmove', function(e) { onPressMove(e.touches[0].clientY); });
    voiceOverlay.addEventListener('touchend', onPressEnd);
    voiceOverlay.addEventListener('touchcancel', onPressCancel);

    // Voice mode toggle
    voiceBtn.addEventListener('click', function() {
        isVoiceMode = !isVoiceMode;
        voiceBtn.classList.toggle('active', isVoiceMode);
        if (isVoiceMode) {
            voiceBtn.innerHTML = '<i class="fa fa-keyboard-o text-lg"></i>';
            msgInput.placeholder = '按住说话';
            msgInput.disabled = true;
            sendBtn.classList.add('hidden');
        } else {
            voiceBtn.innerHTML = '<i class="fa fa-microphone text-lg"></i>';
            msgInput.placeholder = '输入消息...';
            msgInput.disabled = false;
            msgInput.focus();
            updateSendBtn();
        }
        updateVoiceOverlay();
    });

    function startRecording() {
        if (voiceRecord.isRecording) return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (LOVE.showToast) LOVE.showToast('浏览器不支持录音');
            return;
        }
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
            voiceRecord.isRecording = true;
            voiceRecord.chunks = [];
            voiceRecord.isCancelled = false;
            voiceRecord.startTime = Date.now();
            var mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            voiceRecord.mediaRecorder = mr;
            mr.ondataavailable = function(e) { if (e.data.size > 0) voiceRecord.chunks.push(e.data); };
            mr.onstop = function() {
                stream.getTracks().forEach(function(t) { t.stop(); });
                if (voiceRecord.isCancelled) { voiceRecord.isRecording = false; hideVoiceUI(); return; }
                var blob = new Blob(voiceRecord.chunks, { type: 'audio/webm' });
                var reader = new FileReader();
                reader.onload = async function() {
                    var duration = Math.round((Date.now() - voiceRecord.startTime) / 1000);
                    if (LOVE.sendVoiceMessage) await LOVE.sendVoiceMessage(reader.result, duration);
                    voiceRecord.isRecording = false;
                    hideVoiceUI();
                };
                reader.readAsDataURL(blob);
            };
            mr.start();
            showVoiceUI();
            voiceRecord.timerInterval = setInterval(function() {
                var elapsed = Math.floor((Date.now() - voiceRecord.startTime) / 1000);
                var mins = Math.floor(elapsed / 60);
                var secs = elapsed % 60;
                var timer = document.getElementById('voice-record-timer');
                if (timer) timer.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
            }, 200);
        }).catch(function() {
            if (LOVE.showToast) LOVE.showToast('无法获取麦克风权限');
        });
    }

    function showVoiceUI() {
        var overlay = document.getElementById('voice-record-overlay');
        if (overlay) overlay.classList.add('show');
        var timer = document.getElementById('voice-record-timer');
        if (timer) timer.textContent = '00:00';
        var zone = document.getElementById('voice-cancel-zone');
        if (zone) zone.classList.remove('show');
    }

    function hideVoiceUI() {
        var overlay = document.getElementById('voice-record-overlay');
        if (overlay) overlay.classList.remove('show');
        var zone = document.getElementById('voice-cancel-zone');
        if (zone) zone.classList.remove('show');
        if (voiceRecord.timerInterval) { clearInterval(voiceRecord.timerInterval); voiceRecord.timerInterval = null; }
    }

    function stopRecording(cancel) {
        if (!voiceRecord.isRecording) return;
        voiceRecord.isCancelled = cancel;
        if (voiceRecord.mediaRecorder && voiceRecord.mediaRecorder.state === 'recording') voiceRecord.mediaRecorder.stop();
        if (voiceRecord.timerInterval) { clearInterval(voiceRecord.timerInterval); voiceRecord.timerInterval = null; }
        voiceRecord.isRecording = false;
        hideVoiceUI();
    }

    // ---- Emoji button: set immediately (no race condition) ----
    function toggleEmojiDrawer() {
        expandPanel.classList.remove('show');
        emojiDrawer.classList.toggle('show');
        document.body.classList.toggle('emoji-open', emojiDrawer.classList.contains('show'));
        if (emojiDrawer.classList.contains('show')) {
            try {
                if (typeof LOVE.renderEmojiDrawer === 'function') LOVE.renderEmojiDrawer();
                if (typeof LOVE.switchEmojiTab === 'function') LOVE.switchEmojiTab('emoji-lib');
            } catch (err) { console.error('emoji render error:', err); }
        }
    }
    emojiBtn.onclick = function(e) {
        e.stopPropagation();
        toggleEmojiDrawer();
    };

    // ---- Send button: set immediately ----
    sendBtn.onclick = function(e) {
        e.stopPropagation();
        if (LOVE.sendMessage) LOVE.sendMessage();
    };

    // ---- Expand panel: use LOVE APIs directly ----
    function applyVisibleExpItems() {
        var items = document.querySelectorAll('#expand-panel .exp-item');
        if (!items.length) return;
        var contact = null;
        if (LOVE && LOVE.getCurrentContact) contact = LOVE.getCurrentContact();
        if (!contact || !contact.visibleExpItems || !contact.visibleExpItems.length) {
            items.forEach(function(it) { it.style.display = ''; });
            return;
        }
        var allowed = contact.visibleExpItems;
        items.forEach(function(it) {
            var act = it.dataset.action;
            it.style.display = allowed.indexOf(act) !== -1 ? '' : 'none';
        });
    }

    expandBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        emojiDrawer.classList.remove('show');
        document.body.classList.remove('emoji-open');
        applyVisibleExpItems();
        expandPanel.classList.toggle('show');
    });

    expandPanel.addEventListener('click', function(e) {
        e.stopPropagation();
        var item = e.target.closest('.exp-item');
        if (!item) return;
        var action = item.dataset.action;
        expandPanel.classList.remove('show');
        switch (action) {
            case 'contact-list':
                if (LOVE.showHomeView) LOVE.showHomeView();
                break;
            case 'video-call':
                if (LOVE.currentChatType && LOVE.currentChatType() === 'group') {
                    if (LOVE.startGroupCall) LOVE.startGroupCall();
                } else {
                    if (LOVE.startCall) LOVE.startCall();
                }
                break;
            case 'camera':
                var fi = document.createElement('input');
                fi.type = 'file'; fi.accept = 'image/*';
                fi.onchange = function(ev) {
                    var f = ev.target.files[0]; if (!f) return;
                    if (LOVE.compressImage) {
                        LOVE.compressImage(f, 1200, 0.88).then(function(src) {
                            if (src && LOVE.sendStickerMsg) LOVE.sendStickerMsg(src, 'shared');
                        });
                    }
                };
                fi.click();
                break;
            case 'album':
                var ai = document.createElement('input');
                ai.type = 'file'; ai.accept = 'image/*';
                ai.onchange = function(ev) {
                    var f = ev.target.files[0]; if (!f) return;
                    if (LOVE.compressImage) {
                        LOVE.compressImage(f, 1200, 0.88).then(function(src) {
                            if (src && LOVE.sendStickerMsg) LOVE.sendStickerMsg(src, 'shared');
                        });
                    }
                };
                ai.click();
                break;
            case 'mood':
                if (LOVE.openMoodPanel) LOVE.openMoodPanel();
                break;
            case 'period':
                if (LOVE.openPeriodPanel) LOVE.openPeriodPanel();
                break;
            case 'moments':
                if (LOVE.openMoments) LOVE.openMoments();
                break;
            case 'letter':
                if (LOVE.openLetter) LOVE.openLetter();
                break;
            case 'appearance':
                if (LOVE.openAppearance) LOVE.openAppearance();
                break;
            case 'pat':
                var ed = document.getElementById('emoji-drawer');
                if (ed) {
                    ed.classList.add('show');
                    document.body.classList.add('emoji-open');
                    if (LOVE.switchEmojiTab) LOVE.switchEmojiTab('pat');
                }
                break;
            case 'settings':
                if (LOVE.openSettings) LOVE.openSettings();
                break;
            case 'file-manager':
                if (LOVE.openFileManager) LOVE.openFileManager();
                break;
        }
    });

    // ---- Document click: close floating panels ----
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#emoji-btn') && !e.target.closest('#emoji-drawer') && !e.target.closest('#expand-btn') && !e.target.closest('#expand-panel')) {
            emojiDrawer.classList.remove('show');
            document.body.classList.remove('emoji-open');
            expandPanel.classList.remove('show');
        }
    });

    // ---- Guard against main.js overwriting our onclick after setupEventListeners ----
    // waitInit ensures our handlers stay active even after main.js's async initApp completes
    (function waitInit() {
        if (window.__appReady) {
            emojiBtn.onclick = function(e) {
                e.stopPropagation();
                toggleEmojiDrawer();
            };
            sendBtn.onclick = function(e) {
                e.stopPropagation();
                if (LOVE.sendMessage) LOVE.sendMessage();
            };
        } else {
            setTimeout(waitInit, 50);
        }
    })();

    // ---- Open emoji also closes expand panel ----
    emojiBtn.addEventListener('click', function(e) {
        expandPanel.classList.remove('show');
    });

    window.LOVE = LOVE;
})();

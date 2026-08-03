(function() {
            let db;
            const DB_NAME = 'LoveDB_MultiContact';
            const DB_VERSION = 36;
            const DEFAULT_EMOJI_CHARS = ['😀', '😂', '🥰', '😍', '🤩', '😘', '😋', '😎', '😏', '😒', '😔', '😤', '😡', '💀', '💩', '👻',
                '💋', '❤️', '🔔', '✨', '🌟', '🎉', '🌸', '🌺', '🌈', '🔥', '👍', '👎', '👏', '🙌', '💪', '👀'
            ];
            const DEFAULT_KAOMOJI_CHARS = ['(◕‿◕)', '(*^▽^*)', '(╥﹏╥)', '(｡•̀ᴗ-)✧', '(≧∇≦)/', '(๑•́ω•̀๑)', '(´▽` ʃ♡ƪ)',
                '(⁄ ⁄>⁄ω⁄<⁄ ⁄)', '(｡♥‿♥｡)', '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧'
            ];
            const DEFAULT_MOOD_SYMBOLS = [
                { emoji: '😊', name: '开心', description: '今天心情很好' },
                { emoji: '😍', name: '甜蜜', description: '想你了' },
                { emoji: '😢', name: '难过', description: '有点不开心' },
                { emoji: '😤', name: '生气', description: '有点小脾气' },
                { emoji: '🥰', name: '幸福', description: '被你治愈了' },
                { emoji: '😌', name: '平静', description: '平平淡淡的一天' },
                { emoji: '😴', name: '疲惫', description: '好累啊' },
                { emoji: '🤔', name: '思考', description: '在想事情' }
            ];
            const DEFAULT_PAT_LIBRARY = ['拍了拍', '拍了拍的头', '捏了捏的脸', '戳了戳的胳膊'];
            const DEFAULT_STATUS_LIBRARY = ['在线', '正在输入...', '发呆中', '想你中', '刚看到消息'];

            // ===== 经期相关全局变量 =====
            let periodRecords = [];
            let periodCycles = [];
            let currentPeriodTab = 'calendar';
            let currentModule = 'mood';

            let contacts = [];
            let currentContactId = null;
            let messages = [];
            let cachedContactMessages = {};
            let cachedGroupMessages = {};
            const MAX_CACHED_CONTACTS = 30;
            function trimMessageCache() {
                const keys = Object.keys(cachedContactMessages);
                if (keys.length > MAX_CACHED_CONTACTS) {
                    const toRemove = keys.slice(0, keys.length - MAX_CACHED_CONTACTS);
                    toRemove.forEach(k => delete cachedContactMessages[k]);
                }
            }
            let wordCardGroups = [];
            let emojis = [];
            let emojiChars = [...DEFAULT_EMOJI_CHARS];
            let kaomojiChars = [...DEFAULT_KAOMOJI_CHARS];
            let letters = [];
            let posts = [];
            let momentTimers = {};
            let settings = {
                myName: '我',
                myStatus: '在线',
                myAvatar: 'https://picsum.photos/200/200?random=2',
                themeColor: '#D4A5A5',
                bubbleMeColor: '#E8D5C4',
                bubbleYouColor: '#FFFFFF',
                borderRadius: 20,
                bgImage: '',
                bgBlur: 0,
                bgOpacity: 1,
                darkMode: false,
                bgEffects: { enabled: true },
                myMoodText: '😊',
                minReplyTime: 1,
                maxReplyTime: 3600,
                maxCardsPerReply: 3,
                statusMin: 5,
                statusMax: 60,
                activeMsgEnabled: false,
                activeMsgMin: 10,
                activeMsgMax: 60,
                activeMsgChance: 0.3,
                partnerCallChance: 0.05,
                callAcceptChance: 0.6,
                callRejectChance: 0.4,
                callHangupMin: 2,
                callHangupMax: 15,
                patCooldown: 5,
                patLibrary: [...DEFAULT_PAT_LIBRARY],
                partnerPatGroups: [],
                statusLibrary: [...DEFAULT_STATUS_LIBRARY],
                callBgs: [],
                customWeatherOptions: [],
                separateEmojiEnabled: true,
                quoteEnabled: true,
                quoteChance: 0.3,
                combineCardsEnabled: true,
                combineCardsChance: 0.3,
                combineCardsMin: 2,
                combineCardsMax: 4,
                moodRecycleBin: [],
                moodSymbols: DEFAULT_MOOD_SYMBOLS,
                myMoodHistory: [],
                myMood: 85,
                letterReplyMin: 3600,
                letterReplyMax: 86400,
                letterCardCountMin: 5,
                letterCardCountMax: 15,
                partnerLetterMin: 10,
                partnerLetterMax: 24,
                partnerLetterEnabled: true,
                partnerLetterChance: 0.3,
                moodRefreshHour: 6,
                pendingLetterReplies: [],
                groupCallAcceptChance: 0.7,
                groupCallRejectChance: 0.2,
                groupCallTimeoutChance: 0.1,
                replyPatChance: 0.07,
                replyCallChance: 0.03,
                postReplyMin: 300,
                postReplyMax: 21600,
                commentReplyMin: 180,
                commentReplyMax: 1800,
                commentReplyChance: 1.0,
                voiceReplyChance: 0.06,
                generalVoiceGroups: [],
                emojiPacks: [],
                sharedEmojiGroups: [{ id: 'default', name: '默认', enabled: true }],
                // ===== 新增回复设置 =====
                maxCardsPerReplyUser: 4,
                readReceiptEnabled: false,
                readReceiptChance: 0.2,
                // ===== 经期默认设置 =====
                period: {
                    reminders: {
                        periodStart: true,
                        periodEnd: true,
                        ovulation: false,
                        nextPeriod: true,
                        daysBefore: 2,
                        time: '08:00'
                    },
                    customMessages: {
                        periodStart: '大姨妈快来了，包包里放片卫生巾吧 🌸',
                        periodEnd: '经期结束了，可以吃点好的补补 💪'
                    },
                    privacy: {
                        passwordEnabled: false,
                        password: null
                    },
                    averageCycle: 28,
                    averagePeriod: 5,
                    lastPeriodStart: null,
                    lastPeriodEnd: null
                }
            };
            let replyTimer = null,
                statusTimer = null,
                activeMsgTimer = null,
                callTimer = null,
                partnerLetterTimer = null,
                partnerCallTimer = null,
                moodRefreshTimer = null,
                chatInviteTimer = null;
            let autoHangup = null;
            let callState = { status: 'idle', initiator: null, contactId: null, startTime: null, muted: false, minimized: false,
                displayMode: 'full', durationInterval: null, hangupTimer: null };
            let replyQueue = [];
            let patLastTime = 0;
            let currentCalendarDate = new Date();
            let floatWindowDragState = { isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0, target: null };
            let pipResizeState = { isResizing: false, startX: 0, startY: 0, initialW: 240, initialH: 360, initialX: 0, initialY: 0, dir: 'se' };
            function resizeStart(e, dir) {
                e.stopPropagation();
                var el = document.getElementById('call-pip-window');
                pipResizeState.isResizing = true;
                pipResizeState.startX = e.clientX;
                pipResizeState.startY = e.clientY;
                pipResizeState.initialW = el.offsetWidth;
                pipResizeState.initialH = el.offsetHeight;
                pipResizeState.initialX = el.offsetLeft;
                pipResizeState.initialY = el.offsetTop;
                pipResizeState.dir = dir;
                pipResizeState.target = el;
                el.style.transition = 'none';
            }
            function floatDragStart(e) {
                var el = document.getElementById('call-float-window');
                floatWindowDragState.isDragging = true;
                floatWindowDragState.startX = e.clientX;
                floatWindowDragState.startY = e.clientY;
                floatWindowDragState.initialX = el.offsetLeft;
                floatWindowDragState.initialY = el.offsetTop;
                floatWindowDragState.target = el;
                el.style.transition = 'none';
            }
            function pipDragStart(e) {
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
                var el = document.getElementById('call-pip-window');
                floatWindowDragState.isDragging = true;
                floatWindowDragState.startX = e.clientX;
                floatWindowDragState.startY = e.clientY;
                floatWindowDragState.initialX = el.offsetLeft;
                floatWindowDragState.initialY = el.offsetTop;
                floatWindowDragState.target = el;
                el.style.transition = 'none';
            }
            let quotedMessage = null;
            let groups = [];
            let currentGroupId = null;
            let currentChatType = 'private';
            let groupMessages = [];
            let groupCallState = {
                status: 'idle',
                initiator: null,
                groupId: null,
                startTime: null,
                muted: false,
                minimized: false,
                displayMode: 'full',
                durationInterval: null,
                participants: [],
                memberStates: {},
                memberTimers: {},
                memberDurations: {},
                rejoinTimers: {},
                memberJoinTimes: {},
                memberTimeoutTimers: {}
            };
            let groupFloatWindowDragState = { isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0, target: null };
            let groupPipResizeState = { isResizing: false, startX: 0, startY: 0, initialW: 260, initialH: 380, initialX: 0, initialY: 0, dir: 'se' };
            function groupFloatDragStart(e) {
                var el = document.getElementById('group-call-float-window');
                groupFloatWindowDragState.isDragging = true;
                groupFloatWindowDragState.startX = e.clientX;
                groupFloatWindowDragState.startY = e.clientY;
                groupFloatWindowDragState.initialX = el.offsetLeft;
                groupFloatWindowDragState.initialY = el.offsetTop;
                groupFloatWindowDragState.target = el;
                el.style.transition = 'none';
            }
            function groupPipDragStart(e) {
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
                var el = document.getElementById('group-call-pip-window');
                groupFloatWindowDragState.isDragging = true;
                groupFloatWindowDragState.startX = e.clientX;
                groupFloatWindowDragState.startY = e.clientY;
                groupFloatWindowDragState.initialX = el.offsetLeft;
                groupFloatWindowDragState.initialY = el.offsetTop;
                groupFloatWindowDragState.target = el;
                el.style.transition = 'none';
            }
            function groupResizeStart(e, dir) {
                e.stopPropagation();
                var el = document.getElementById('group-call-pip-window');
                groupPipResizeState.isResizing = true;
                groupPipResizeState.startX = e.clientX;
                groupPipResizeState.startY = e.clientY;
                groupPipResizeState.initialW = el.offsetWidth;
                groupPipResizeState.initialH = el.offsetHeight;
                groupPipResizeState.initialX = el.offsetLeft;
                groupPipResizeState.initialY = el.offsetTop;
                groupPipResizeState.dir = dir;
                groupPipResizeState.target = el;
                el.style.transition = 'none';
            }
            let allStatusTimers = {};
            let voiceRecordState = { isRecording: false, mediaRecorder: null, chunks: [], startTime: null, timerInterval: null,
                isCancelled: false, touchStartY: 0, longPressTimer: null, isLongPress: false, preventClick: false };
            let currentlyPlayingVoice = null;
            let voiceAutoPlayQueue = [];
            let groupTypingBarTimeout = null;
            let typingCounter = 0;

            const chatContainer = document.getElementById('chat-container');
            const messageInput = document.getElementById('message-input');

            function initDB() {
                return new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('IndexedDB 打开超时，请关闭其他标签页后重试')), 8000);
                    const req = indexedDB.open(DB_NAME, DB_VERSION);
                    req.onerror = () => { clearTimeout(timeout); reject(req.error); };
                    req.onsuccess = () => { clearTimeout(timeout); db = req.result;
                        resolve(db); };
                    req.onblocked = () => { clearTimeout(timeout); reject(new Error('数据库被其他页面占用，请关闭后重试')); };
                    req.onupgradeneeded = e => {
                        const d = e.target.result;
                        if (!d.objectStoreNames.contains('messages')) {
                            const s = d.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
                            s.createIndex('contactId', 'contactId', { unique: false });
                        }
                        if (!d.objectStoreNames.contains('wordCards')) d.createObjectStore('wordCards', { keyPath: 'id',
                            autoIncrement: true });
                        if (!d.objectStoreNames.contains('emojis')) d.createObjectStore('emojis', { keyPath: 'id',
                            autoIncrement: true });
                        if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings', { keyPath: 'key' });
                        if (!d.objectStoreNames.contains('letters')) {
                            const s = d.createObjectStore('letters', { keyPath: 'id', autoIncrement: true });
                            s.createIndex('contactId', 'contactId', { unique: false });
                        }
                        if (!d.objectStoreNames.contains('contacts')) d.createObjectStore('contacts', { keyPath: 'id',
                            autoIncrement: true });
                        if (!d.objectStoreNames.contains('posts')) {
                            const ps = d.createObjectStore('posts', { keyPath: 'id', autoIncrement: true });
                            ps.createIndex('authorId', 'authorId', { unique: false });
                        }
                        if (!d.objectStoreNames.contains('groups')) d.createObjectStore('groups', { keyPath: 'id',
                            autoIncrement: true });
                        if (!d.objectStoreNames.contains('groupMessages')) {
                            const s = d.createObjectStore('groupMessages', { keyPath: 'id', autoIncrement: true });
                            s.createIndex('groupId', 'groupId', { unique: false });
                        }
                        // ===== 经期store =====
                        if (!d.objectStoreNames.contains('periodRecords')) {
                            const s = d.createObjectStore('periodRecords', { keyPath: 'id', autoIncrement: true });
                            s.createIndex('date', 'date', { unique: false });
                            s.createIndex('contactId', 'contactId', { unique: false });
                        } else {
                            const s = e.target.transaction.objectStore('periodRecords');
                            try {
                                if (s.indexNames.contains('date')) s.deleteIndex('date');
                                s.createIndex('date', 'date', { unique: false });
                            } catch (ex) { /* 重建 date 索引 */ }
                            try {
                                if (s.indexNames.contains('contactId')) s.deleteIndex('contactId');
                                s.createIndex('contactId', 'contactId', { unique: false });
                            } catch (ex) { /* 重建 contactId 索引 */ }
                        }
                        if (!d.objectStoreNames.contains('periodCycles')) {
                            const s = d.createObjectStore('periodCycles', { keyPath: 'id', autoIncrement: true });
                            s.createIndex('startDate', 'startDate', { unique: false });
                            s.createIndex('contactId', 'contactId', { unique: false });
                        }
                    };
                });
            }

            function dbOp(mode, store, fn) {
                return new Promise((res, rej) => {
                    if (!db) return rej(new Error('IndexedDB \u672a\u521d\u59cb\u5316'));
                    const t = db.transaction(store, mode);
                    const s = t.objectStore(store);
                    const r = fn(s);
                    if (r && r.onsuccess !== undefined) { r.onsuccess = () => res(r.result);
                        r.onerror = () => rej(r.error); } else res(r);
                });
            }
            const addData = (s, d) => dbOp('readwrite', s, st => st.add(d));
            const getAllData = s => dbOp('readonly', s, st => st.getAll());
            const updateData = (s, d) => dbOp('readwrite', s, st => st.put(d));
            const deleteData = (s, id) => dbOp('readwrite', s, st => st.delete(id));
            const clearStore = s => dbOp('readwrite', s, st => st.clear());

            function deleteAllFromIndex(storeName, indexName, key) {
                return new Promise((resolve, reject) => {
                    if (!db) return reject(new Error('IndexedDB \u672a\u521d\u59cb\u5316'));
                    const tx = db.transaction(storeName, 'readwrite');
                    const store = tx.objectStore(storeName);
                    const index = store.index(indexName);
                    const req = index.openCursor(key);
                    req.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor) { cursor.delete();
                            cursor.continue(); } else resolve();
                    };
                    req.onerror = (e) => reject(e.target.error);
                });
            }

            function escapeHtml(t) { const d = document.createElement('div');
                d.textContent = t; return d.innerHTML; }
            function formatTimeAgo(isoStr) {
                if (!isoStr) return '';
                const diff = Date.now() - new Date(isoStr).getTime();
                const mins = Math.floor(diff / 60000);
                if (mins < 1) return '刚刚';
                if (mins < 60) return mins + '分钟前';
                const hours = Math.floor(mins / 60);
                if (hours < 24) return hours + '小时前';
                const days = Math.floor(hours / 24);
                if (days < 30) return days + '天前';
                return new Date(isoStr).toLocaleDateString();
            }

            function compressImage(file, maxDimension = 1920, quality = 0.88) {
                return new Promise((resolve, reject) => {
                    if (!file.type.startsWith('image/')) { resolve(null); return; }
                    const MAX_BYTES = 20 * 1024 * 1024;
                    if (file.size > MAX_BYTES) {
                        showToast('文件过大，请选择小于 20MB 的文件');
                        resolve(null);
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            let w = img.width, h = img.height;
                            if (w <= maxDimension && h <= maxDimension && file.size < 500 * 1024) {
                                resolve(e.target.result);
                                return;
                            }
                            if (w > maxDimension || h > maxDimension) {
                                const ratio = Math.min(maxDimension / w, maxDimension / h);
                                w = Math.round(w * ratio);
                                h = Math.round(h * ratio);
                            }
                            const canvas = document.createElement('canvas');
                            canvas.width = w;
                            canvas.height = h;
                            const ctx = canvas.getContext('2d');
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'high';
                            ctx.drawImage(img, 0, 0, w, h);
                            const format = canvas.toDataURL('image/webp', quality).length < canvas.toDataURL('image/jpeg', quality).length ? 'image/webp' : 'image/jpeg';
                            try {
                                const result = canvas.toDataURL(format, quality);
                                resolve(result);
                            } catch (ex) {
                                resolve(canvas.toDataURL('image/jpeg', quality));
                            }
                        };
                        img.onerror = () => resolve(e.target.result);
                        img.src = e.target.result;
                    };
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(file);
                });
            }

            function formatTime(is) { return new Date(is).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); }

            function formatDate(is) { return new Date(is).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long',
                    day: 'numeric' }); }

            function formatDateISO(date) { const y = date.getFullYear(),
                    m = String(date.getMonth() + 1).padStart(2, '0'),
                    d = String(date.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`; }

            function formatDateShort(is) { const d = new Date(is); return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`; }
            function formatDateTime(is) { var d = new Date(is); return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); }


            function isSameDay(d1, d2) { return new Date(d1).toDateString() === new Date(d2).toDateString(); }

            function scrollToBottom() { if (chatContainer) { chatContainer.scrollTop = chatContainer.scrollHeight; } }

            function showToast(msg) {
                const t = document.createElement('div');
                t.className =
                    'fixed top-20 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm text-[var(--text-primary)] px-5 py-3 rounded-2xl shadow-xl z-[100] text-sm font-medium border border-[var(--theme-light)]';
                t.textContent = msg;
                document.body.appendChild(t);
                setTimeout(() => t.remove(), 2500);
            }

            function showLetterNotification(msg) {
                const t = document.createElement('div');
                t.className =
                    'fixed top-20 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-2xl shadow-xl z-[100] text-sm font-medium flex items-center space-x-2 animate-slide-down';
                t.style.background = 'var(--card-bg)';
                t.style.color = 'var(--text-primary)';
                t.style.border = '1px solid var(--border-color)';
                t.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)';
                const icon = document.createElement('i');
                icon.className = 'fa fa-envelope-o';
                icon.style.color = 'var(--theme)';
                const span = document.createElement('span');
                span.textContent = msg;
                t.appendChild(icon);
                t.appendChild(span);
                document.body.appendChild(t);
                setTimeout(() => { t.style.opacity = '0';
                    t.style.transition = 'opacity 0.5s';
                    setTimeout(() => t.remove(), 500); }, 3000);
            }

            var notifTimer = null;

            function showNotification(name, text, avatar, contactId) {
                var popup = document.getElementById('notification-popup');
                var inner = document.getElementById('notif-inner');
                if (!popup || !inner) return;
                if (notifTimer) { clearTimeout(notifTimer); popup.classList.add('hidden'); }
                document.getElementById('notif-avatar').src = avatar || 'https://picsum.photos/200/200?random=1';
                document.getElementById('notif-name').textContent = name;
                document.getElementById('notif-text').textContent = text;
                popup.dataset.contactId = contactId || '';
                popup.classList.remove('hidden');
                popup.style.transform = '';
                popup.style.opacity = '';
                notifTimer = setTimeout(function() { popup.classList.add('hidden'); }, 4000);
                inner.onclick = function() {
                    popup.classList.add('hidden');
                    if (notifTimer) clearTimeout(notifTimer);
                    if (contactId) switchContact(contactId);
                };
                var startX = 0, startY = 0, startTime = 0;
                inner.ontouchstart = function(e) {
                    startX = e.touches[0].clientX;
                    startY = e.touches[0].clientY;
                    startTime = Date.now();
                    if (notifTimer) { clearTimeout(notifTimer); notifTimer = null; }
                };
                inner.ontouchmove = function(e) {
                    var dx = e.touches[0].clientX - startX;
                    var dy = e.touches[0].clientY - startY;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        popup.style.transform = 'translateX(' + dx + 'px)';
                        popup.style.opacity = Math.max(0, 1 - Math.abs(dx) / 200);
                    } else if (dy < 0) {
                        popup.style.transform = 'translateY(' + dy + 'px)';
                        popup.style.opacity = Math.max(0, 1 + dy / 100);
                    }
                };
                inner.ontouchend = function(e) {
                    var dx = e.changedTouches[0].clientX - startX;
                    var dy = e.changedTouches[0].clientY - startY;
                    var dt = Date.now() - startTime;
                    if (Math.abs(dx) > 80 || Math.abs(dy) > 80 || (Math.abs(dx) > 30 && dt < 300)) {
                        popup.classList.add('hidden');
                    } else {
                        popup.style.transform = '';
                        popup.style.opacity = '';
                        if (!notifTimer) notifTimer = setTimeout(function() { popup.classList.add('hidden'); }, 3000);
                    }
                    startX = startY = 0;
                };
            }

            function showImageLightbox(src) {
                var lb = document.getElementById('image-lightbox');
                var img = document.getElementById('lightbox-img');
                if (lb && img && src) { img.src = src; lb.classList.remove('hidden'); }
            }

            let isTypingVisible = false;

            function showTyping() {
                if (isTypingVisible) return;
                const avatar = currentChatType === 'group' ? 'https://picsum.photos/200/200?random=1' : getCurrentContact()
                    ?.avatar || 'https://picsum.photos/200/200?random=1';
                const d = document.createElement('div');
                d.id = 'typing-indicator';
                d.className = 'flex justify-start';
                d.innerHTML =
                    `<div class="flex items-end space-x-2"><img src="${avatar}" class="w-7 h-7 rounded-full"><div class="message-bubble-left px-4 py-3 card-shadow flex space-x-1.5"><span class="typing-dot w-2 h-2 bg-gray-400 rounded-full"></span><span class="typing-dot w-2 h-2 bg-gray-400 rounded-full"></span><span class="typing-dot w-2 h-2 bg-gray-400 rounded-full"></span></div></div>`;
                chatContainer.appendChild(d);
                scrollToBottom();
                isTypingVisible = true;
            }

            function removeTyping() {
                const el = document.getElementById('typing-indicator');
                if (el) el.remove();
                isTypingVisible = false;
            }

            function hideQuoteBar() { quotedMessage = null;
                document.getElementById('quote-bar').classList.add('hidden'); }

            function clearReplyQueue() {
                replyQueue.forEach(item => clearTimeout(item.timerId));
                replyQueue = [];
                removeTyping();
            }

            function getCurrentContact() { return contacts.find(c => c.id === currentContactId); }

            function getCurrentGroup() { return groups.find(g => g.id === currentGroupId); }

            // ---------- 字卡池（含屏蔽过滤） ----------
            function buildWordCardPool(contactId) {
                let pool = [];
                wordCardGroups.forEach(group => {
                    if (group.enabled) {
                        const blocked = group.blockedCards || [];
                        group.cards.forEach(card => {
                            const text = typeof card === 'string' ? card.trim() : card.text?.trim() || '';
                            if (text.length > 0 && !blocked.includes(text)) {
                                pool.push(text);
                            }
                        });
                    }
                });
                if (contactId) {
                    const contact = contacts.find(c => c.id === contactId);
                    if (contact?.uniqueWordCardGroups) {
                        contact.uniqueWordCardGroups.forEach(group => {
                            if (group.enabled) {
                                const blocked = group.blockedCards || [];
                                group.cards.forEach(card => {
                                    const text = typeof card === 'string' ? card.trim() : card.text?.trim() || '';
                                    if (text.length > 0 && !blocked.includes(text)) {
                                        pool.push(text);
                                    }
                                });
                            }
                        });
                    }
                }
                return [...new Set(pool)];
            }

            function buildStickerPool(contactId) {
                let pool = [];
                emojis.filter(e => e.category === 'shared').forEach(e => pool.push(e));
                if (contactId) {
                    const contact = contacts.find(c => c.id === contactId);
                    if (contact?.uniqueEmojis) pool.push(...contact.uniqueEmojis);
                }
                return pool;
            }

            function buildVoicePool(contactId) {
                let pool = [];
                var contact = contactId ? contacts.find(function(c) { return c.id === contactId; }) : null;
                var vGroups = contact ? getContactReplySetting(contact, 'generalVoiceGroups') : settings.generalVoiceGroups;
                if (vGroups) {
                    vGroups.forEach(function(group) { if (group.enabled) pool.push.apply(pool, group.items); });
                }
                if (contact && contact.uniqueVoiceGroups) {
                    contact.uniqueVoiceGroups.forEach(function(group) { if (group.enabled) pool.push.apply(pool, group.items); });
                }
                return pool;
            }

            function getAllEmojiChars() { return emojiChars; }

            function getAllKaomoji() { return kaomojiChars; }

            function getWeatherPool() {
                const builtIn = ['晴', '多云', '阴', '小雨', '中雨', '大雨', '雪', '大风', '雾', '霾', '雷阵雨', '晴转多云', '阴转晴'];
                const custom = settings.customWeatherOptions || [];
                return [...new Set([...builtIn, ...custom])];
            }

            function getPartnerPatPool(contact) {
                const pool = [];
                var pGroups = contact ? getContactReplySetting(contact, 'partnerPatGroups') : settings.partnerPatGroups;
                if (pGroups) {
                    pGroups.forEach(g => { if (g.enabled) pool.push(...g.items); });
                }
                return pool;
            }

            function isSharedCardDuplicate(cardText) {
                for (const group of wordCardGroups) {
                    if (group.cards.includes(cardText)) {
                        return true;
                    }
                }
                return false;
            }

            function defaultReplySettings() {
                return {
                    minReplyTime: 1,
                    maxReplyTime: 3600,
                    separateEmojiEnabled: true,
                    quoteEnabled: true,
                    quoteChance: 0.3,
                    combineCardsEnabled: true,
                    combineCardsChance: 0.3,
                    combineCardsMin: 2,
                    combineCardsMax: 4,
                    readReceiptEnabled: false,
                    readReceiptChance: 0.2,
                    activeMsgEnabled: true,
                    activeMsgMin: 10,
                    activeMsgMax: 60,
                    activeMsgChance: 0.3,
                    letterReplyMin: 3600,
                    letterReplyMax: 43200,
                    letterCardCountMin: 5,
                    letterCardCountMax: 15,
                    partnerCallChance: 0.05,
                    partnerLetterEnabled: true,
                    partnerLetterMin: 10,
                    partnerLetterMax: 24,
                    partnerLetterChance: 0.3,
                    callHangupMin: 1,
                    callHangupMax: 5,
                    replyPatChance: 0.07,
                    replyCallChance: 0.03,
                    voiceReplyChance: 0.06,
                    postReplyMin: 300,
                    postReplyMax: 21600,
                    commentReplyMin: 180,
                    commentReplyMax: 1800,
                    commentReplyChance: 1.0,
                    statusMin: 5,
                    statusMax: 60,
                    groupCallAcceptChance: 0.6,
                    groupCallRejectChance: 0.1,
                    maxCardsPerReplyUser: 4,
                    momentsBg: '',
                    generalVoiceGroups: [],
                    patLibrary: ['拍了拍', '拍了拍的头', '捏了捏的脸', '戳了戳的胳膊'],
                    partnerPatGroups: [],
                    statusLibrary: ['在线', '正在输入...', '发呆中', '想你中', '刚看到消息']
                };
            }
            function getContactReplySetting(contact, key) {
                if (!contact || !contact.replySettings) return settings[key];
                return contact.replySettings[key] !== undefined ? contact.replySettings[key] : settings[key];
            }
            async function addContact(contactData) {
                const def = {
                    name: 'TA',
                    avatar: 'https://picsum.photos/200/200?random=' + Math.floor(Math.random() * 1000),
                    status: '在线',
                    partnerMoodHistory: [],
                    partnerMoodIndex: 50 + Math.floor(Math.random() * 50),
                    timezoneOffset: 8,
                    timeFlowSpeed: 1,
                    uniqueWordCardGroups: [],
                    uniqueEmojis: [],
                    uniqueVoiceGroups: [],
                    avatarFrame: 'none',
                    createTime: new Date().toISOString(),
                    bgImage: '',
                    visibleExpItems: ['contact-list', 'video-call', 'camera', 'album', 'mood', 'period', 'moments', 'letter', 'appearance', 'pat', 'settings'],
                    replySettings: defaultReplySettings()
                };
                const nc = { ...def, ...contactData };
                if (!nc.replySettings) nc.replySettings = defaultReplySettings();
                const id = await addData('contacts', nc);
                nc.id = id;
                contacts.push(nc);
                return nc;
            }
            async function updateContact(contact) {
                await updateData('contacts', contact);
                const idx = contacts.findIndex(c => c.id === contact.id);
                if (idx !== -1) contacts[idx] = contact;
            }
            async function deleteContact(contactId) {
                await deleteData('contacts', contactId);
                await deleteAllFromIndex('messages', 'contactId', contactId);
                await deleteAllFromIndex('letters', 'contactId', contactId);
                contacts = contacts.filter(c => c.id !== contactId);
                if (cachedContactMessages[contactId]) delete cachedContactMessages[contactId];
                if (currentContactId === contactId && contacts.length > 0) await switchContact(contacts[0].id);
            }

            async function createGroup(name, memberIds) {
                const g = { name, avatar: '', members: memberIds, createTime: new Date().toISOString(), bgImage: '' };
                const id = await addData('groups', g);
                g.id = id;
                groups.push(g);
                return g;
            }
            async function deleteGroup(groupId) {
                if (!confirm('确定删除该群聊及其所有聊天记录？')) return;
                await deleteData('groups', groupId);
                await deleteAllFromIndex('groupMessages', 'groupId', groupId);
                groups = groups.filter(g => g.id !== groupId);
                groupMessages = groupMessages.filter(m => m.groupId !== groupId);
                if (currentGroupId === groupId) {
                    if (groups.length > 0) await switchGroup(groups[0].id);
                    else { currentGroupId = null;
                        currentChatType = 'private'; if (contacts.length > 0) await switchContact(contacts[0].id); }
                }
                renderGroupList();
                renderMessages();
            }

            function renderGroupList() {
                renderContactList();
                const container = document.getElementById('group-list');
                if (!container) return;
                container.innerHTML = '';
                groups.forEach(g => {
                    const card = document.createElement('div');
                    card.className = 'group-tab flex items-center p-3';
                    const stack = document.createElement('div');
                    stack.className = 'group-avatar-stack';
                    g.members.slice(0, 3).forEach(mid => {
                        const c = contacts.find(c => c.id === mid);
                        if (c) {
                            const img = document.createElement('img');
                            img.className = 'w-8 h-8 rounded-full border';
                            img.src = c.avatar;
                            img.onerror = () => { img.src = 'https://picsum.photos/200/200?random=1'; };
                            stack.appendChild(img);
                        }
                    });
                    card.appendChild(stack);
                    const flex = document.createElement('div');
                    flex.className = 'flex-1';
                    flex.innerHTML =
                        `<p class="font-medium text-sm">${escapeHtml(g.name)}</p><p class="text-xs text-[var(--text-secondary)]">${g.members.length}人</p>`;
                    card.appendChild(flex);
                    const delBtn = document.createElement('button');
                    delBtn.className = 'text-red-400 hover:text-red-600 ml-2';
                    delBtn.style.flexShrink = '0';
                    delBtn.innerHTML = '<i class="fa fa-trash"></i>';
                    delBtn.onclick = (e) => { e.stopPropagation(); deleteGroup(g.id); };
                    card.appendChild(delBtn);
                    const camBtn = document.createElement('button');
                    camBtn.className = 'text-[var(--theme)] hover:text-opacity-80 ml-1';
                    camBtn.style.flexShrink = '0';
                    camBtn.title = '更换群头像';
                    camBtn.innerHTML = '<i class="fa fa-camera"></i>';
                    camBtn.onclick = (e) => {
                        e.stopPropagation();
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (ev) => {
                            const f = ev.target.files[0];
                            if (!f) return;
                            g.avatar = await compressImage(f, 512, 0.9);
                            await updateData('groups', g);
                            if (currentChatType === 'group' && currentGroupId === g.id) {
                                document.getElementById('partner-avatar').src = g.avatar;
                            }
                            renderGroupList();
                            showToast('群聊头像已更新 ✅');
                        };
                        input.click();
                    };
                    card.appendChild(camBtn);
                    card.onclick = () => switchGroup(g.id);
                    container.appendChild(card);
                });
            }

            function getUnreadCountForContact(contactId) {
                var cached = cachedContactMessages[contactId];
                if (cached) return cached.filter(function(m) { return !m.isMe && !m.read; }).length;
                return 0;
            }
            function getUnreadCountForGroup(groupId) {
                var cached = cachedGroupMessages[groupId];
                if (cached) return cached.filter(function(m) { return !m.isMe && !m.read; }).length;
                return 0;
            }
            function renderContactList() {
                var listEl = document.getElementById('conversation-list');
                if (!listEl) return;
                listEl.innerHTML = '';
                var items = [];
                contacts.forEach(function(c) {
                    var unread = c.id === currentContactId && currentChatType === 'private' ? messages.filter(function(m) { return !m.isMe && !m.read; }).length : getUnreadCountForContact(c.id);
                    var lastMsg = '';
                    var lastTime = 0;
                    var cached = cachedContactMessages[c.id];
                    if (cached && cached.length) {
                        var last = cached[cached.length - 1];
                        lastMsg = last.text || (last.type === 'image' ? '[图片]' : (last.type === 'voice' ? '[语音]' : ''));
                        lastTime = new Date(last.timestamp).getTime();
                    }
                    items.push({ id: c.id, type: 'private', name: c.name, avatar: c.avatar, unread: unread, lastMsg: lastMsg, lastTime: lastTime, status: c.status });
                });
                groups.forEach(function(g) {
                    var unread = g.id === currentGroupId && currentChatType === 'group' ? messages.filter(function(m) { return !m.isMe && !m.read; }).length : getUnreadCountForGroup(g.id);
                    var lastMsg = '';
                    var lastTime = 0;
                    var cached = cachedGroupMessages[g.id];
                    if (cached && cached.length) {
                        var last = cached[cached.length - 1];
                        lastMsg = last.text || (last.type === 'image' ? '[图片]' : '');
                        lastTime = new Date(last.timestamp).getTime();
                    }
                    items.push({ id: g.id, type: 'group', name: g.name, avatar: g.avatar || 'https://picsum.photos/200/200?random=group', unread: unread, lastMsg: lastMsg, lastTime: lastTime, status: g.members ? g.members.length + '人' : '' });
                });
                items.sort(function(a, b) {
                    if (a.unread !== b.unread) return b.unread - a.unread;
                    return b.lastTime - a.lastTime;
                });
                items.forEach(function(item) {
                    var card = document.createElement('div');
                    card.className = 'flex items-center p-3 rounded-xl mb-1 bg-[var(--card-bg)] border border-[var(--border-color)] cursor-pointer hover:opacity-80 transition-opacity';
                    var img = document.createElement('img');
                    img.className = 'w-12 h-12 rounded-full object-cover flex-shrink-0';
                    img.src = item.avatar;
                    img.onerror = function() { img.src = 'https://picsum.photos/200/200?random=1'; };
                    card.appendChild(img);
                    var info = document.createElement('div');
                    info.className = 'flex-1 min-w-0 ml-3';
                    var topRow = document.createElement('div');
                    topRow.className = 'flex items-center justify-between';
                    var nameSpan = document.createElement('span');
                    nameSpan.className = 'font-semibold text-sm text-[var(--text-primary)] truncate';
                    nameSpan.textContent = item.name + (item.type === 'group' ? '' : '');
                    topRow.appendChild(nameSpan);
                    if (item.unread > 0) {
                        var badge = document.createElement('span');
                        badge.className = 'bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 min-w-[18px] text-center';
                        badge.textContent = item.unread > 99 ? '99+' : item.unread;
                        topRow.appendChild(badge);
                    }
                    info.appendChild(topRow);
                    var bottomRow = document.createElement('div');
                    bottomRow.className = 'flex items-center justify-between mt-0.5';
                    var preview = document.createElement('span');
                    preview.className = 'text-xs text-[var(--text-secondary)] truncate flex-1';
                    preview.textContent = item.lastMsg || (item.type === 'group' ? '群聊已创建' : '暂无消息');
                    bottomRow.appendChild(preview);
                    if (item.status && item.type === 'private') {
                        var statusSpan = document.createElement('span');
                        statusSpan.className = 'text-[10px] text-[var(--text-secondary)] flex-shrink-0 ml-2';
                        statusSpan.textContent = item.status;
                        bottomRow.appendChild(statusSpan);
                    }
                    info.appendChild(bottomRow);
                    card.appendChild(info);
                    card.onclick = function() {
                        if (item.type === 'private') switchContact(item.id);
                        else switchGroup(item.id);
                    };
                    listEl.appendChild(card);
                });
                if (!items.length) {
                    listEl.innerHTML = '<div class="text-center text-[var(--text-secondary)] py-20 text-sm">暂无联系人和群聊</div>';
                }
            }

            // ===== 联系人主页 =====
            function showContactHome() {
                var contact = getCurrentContact();
                if (!contact) return;
                document.getElementById('ch-avatar').src = contact.avatar;
                document.getElementById('ch-name').textContent = contact.name;
                document.getElementById('ch-status').textContent = contact.status || '在线';
                document.getElementById('ch-nickname').textContent = contact.name;
                var cardCount = 0;
                if (contact.uniqueWordCardGroups) {
                    contact.uniqueWordCardGroups.forEach(function(g) { cardCount += (g.cards || []).length; });
                }
                document.getElementById('ch-card-count').textContent = cardCount;
                applyAvatarEffects();
                document.getElementById('contact-home-panel').classList.add('open');
            }

            // ===== 删除联系人 =====
            function deleteContactAndSwitch(contactId) {
                var contact = contacts.find(function(c) { return c.id === contactId; });
                if (!contact) return;
                if (contacts.length <= 1) { showToast('至少保留一个联系人'); return; }
                deleteData('contacts', contactId);
                contacts = contacts.filter(function(c) { return c.id !== contactId; });
                var msgs = cachedContactMessages[contactId] || [];
                msgs.forEach(function(m) { deleteData('messages', m.id); });
                delete cachedContactMessages[contactId];
                periodRecords = periodRecords.filter(function(r) { return r.contactId !== contactId; });
                var next = contacts[0];
                if (currentContactId === contactId) switchContact(next.id);
                renderContactList();
                showToast('已删除联系人');
            }

            // ===== 管理子弹窗 =====
            function openChSubModal(type, contact) {
                if (!contact) contact = getCurrentContact();
                if (!contact) return;
                var modal = document.getElementById('ch-sub-modal');
                var title = document.getElementById('ch-sub-title');
                var content = document.getElementById('ch-sub-content');
                if (!modal || !title || !content) return;
                modal.classList.remove('hidden');
                if (type === 'bubble-css') {
                    title.textContent = '💬 气泡CSS - ' + contact.name;
                    var curCss = contact.bubbleCss || '';
                    content.innerHTML = '<div class="text-sm space-y-3"><p class="text-xs text-[var(--text-secondary)]">自定义此联系人的聊天气泡样式（CSS）</p><textarea id="ch-bubble-css-input" rows="6" class="w-full px-3 py-2 border rounded-lg text-xs font-mono resize-none" placeholder=".message-bubble-left { background: #fff; }&#10;.message-bubble-right { background: #ffd; }">' + escapeHtml(curCss) + '</textarea><button id="ch-save-bubble-css" class="w-full py-2 text-white rounded-lg text-sm" style="background:var(--theme)">保存气泡CSS</button></div>';
                    content.querySelector('#ch-save-bubble-css').onclick = function() {
                        contact.bubbleCss = content.querySelector('#ch-bubble-css-input').value;
                        updateContact(contact);
                        showToast('气泡CSS已保存');
                        modal.classList.add('hidden');
                    };
                } else if (type === 'reply-settings') {
                    title.textContent = '⚙️ 回复设置 - ' + contact.name;
                    if (!contact.replySettings) { contact.replySettings = defaultReplySettings(); }
                    else { var _def = defaultReplySettings(); for (var _k in _def) { if (contact.replySettings[_k] === undefined) contact.replySettings[_k] = _def[_k]; } }
                    var rs = contact.replySettings;
                    content.innerHTML = '<div class="text-sm space-y-3 max-h-[60vh] overflow-y-auto">'
                        + '<p class="text-xs text-[var(--text-secondary)]">独立设置此联系人的所有自动回复参数</p>'
                        + '<div class="number-control"><span>最快回复(秒)</span><div class="flex items-center space-x-2"><button id="ch-min-reply-dec" class="number-btn">-</button><input type="range" id="ch-min-reply-time" min="1" max="300" value="' + rs.minReplyTime + '" class="w-24"><button id="ch-min-reply-inc" class="number-btn">+</button><span id="ch-min-reply-label" class="w-8 text-right">' + rs.minReplyTime + 's</span></div></div>'
                        + '<div class="number-control"><span>最慢回复(秒)</span><div class="flex items-center space-x-2"><button id="ch-max-reply-dec" class="number-btn">-</button><input type="range" id="ch-max-reply-time" min="1" max="3600" value="' + rs.maxReplyTime + '" class="w-24"><button id="ch-max-reply-inc" class="number-btn">+</button><span id="ch-max-reply-label" class="w-8 text-right">' + rs.maxReplyTime + 's</span></div></div>'
                        + '<div class="flex justify-between"><span>每次回复最大字卡数</span><input type="number" id="ch-max-cards" value="' + (rs.maxCardsPerReplyUser || 4) + '" min="1" max="10" class="w-14 px-1 border rounded text-center"></div>'
                        + '<hr>'
                        + '<div class="flex justify-between"><span>已读不回</span><input type="checkbox" id="ch-read-receipt-enabled" ' + (rs.readReceiptEnabled ? 'checked' : '') + '></div>'
                        + '<div id="ch-read-receipt-row" class="flex justify-between"' + (rs.readReceiptEnabled ? '' : ' style="display:none"') + '><span>已读不回概率</span><input type="range" id="ch-read-receipt-chance" min="0" max="100" value="' + Math.round((rs.readReceiptChance || 0.2) * 100) + '" class="w-24"><span id="ch-read-receipt-label">' + Math.round((rs.readReceiptChance || 0.2) * 100) + '%</span></div>'
                        + '<hr>'
                        + '<div class="flex justify-between"><span>主动发消息</span><input type="checkbox" id="ch-active-msg-enabled" ' + (rs.activeMsgEnabled ? 'checked' : '') + '></div>'
                        + '<div id="ch-active-msg-row" class="flex justify-between"' + (rs.activeMsgEnabled ? '' : ' style="display:none"') + '><span>主动发消息间隔(分)</span><input type="number" id="ch-active-msg-min" value="' + rs.activeMsgMin + '" class="w-12 px-1 border rounded text-center">~<input type="number" id="ch-active-msg-max" value="' + rs.activeMsgMax + '" class="w-12 px-1 border rounded text-center"></div>'
                        + '<hr>'
                        + '<div class="flex justify-between"><span>信件回信最快(分钟)</span><input type="number" id="ch-letter-reply-min" value="' + Math.floor(rs.letterReplyMin / 60) + '" class="w-14 px-1 border rounded text-center"></div>'
                        + '<div class="flex justify-between"><span>信件回信最慢(小时)</span><input type="number" id="ch-letter-reply-max" value="' + Math.floor(rs.letterReplyMax / 3600) + '" class="w-14 px-1 border rounded text-center"></div>'
                        + '<div class="flex justify-between"><span>信件最少字卡数</span><input type="number" id="ch-letter-card-min" value="' + (rs.letterCardCountMin || 5) + '" min="1" max="30" class="w-14 px-1 border rounded text-center"></div>'
                        + '<div class="flex justify-between"><span>信件最多字卡数</span><input type="number" id="ch-letter-card-max" value="' + (rs.letterCardCountMax || 15) + '" min="1" max="30" class="w-14 px-1 border rounded text-center"></div>'
                        + '<hr>'
                        + '<div class="flex justify-between"><span>视频通话时长(分)</span><input type="number" id="ch-call-hangup-min" value="' + rs.callHangupMin + '" class="w-14 px-1 border rounded text-center">~<input type="number" id="ch-call-hangup-max" value="' + rs.callHangupMax + '" class="w-14 px-1 border rounded text-center"></div>'
                        + '<div class="flex justify-between"><span>对方主动来电概率</span><input type="range" id="ch-partner-call-chance" min="0" max="100" value="' + Math.round(rs.partnerCallChance * 100) + '" class="w-24"><span id="ch-partner-call-label">' + Math.round(rs.partnerCallChance * 100) + '%</span></div>'
                        + '<div class="flex justify-between"><span>对方主动来信</span><input type="checkbox" id="ch-partner-letter-enabled" ' + (rs.partnerLetterEnabled ? 'checked' : '') + '></div>'
                        + '<div id="ch-partner-letter-row" class="space-y-3"' + (rs.partnerLetterEnabled ? '' : ' style="display:none"') + '>'
                        + '<div class="flex justify-between"><span>来信间隔(小时)</span><input type="number" id="ch-partner-letter-min" value="' + (rs.partnerLetterMin || 10) + '" class="w-14 px-1 border rounded text-center">~<input type="number" id="ch-partner-letter-max" value="' + (rs.partnerLetterMax || 24) + '" class="w-14 px-1 border rounded text-center"></div>'
                        + '<div class="flex justify-between"><span>主动来信概率</span><input type="range" id="ch-partner-letter-chance" min="0" max="100" value="' + Math.round((rs.partnerLetterChance || 0.3) * 100) + '" class="w-24"><span id="ch-partner-letter-label">' + Math.round((rs.partnerLetterChance || 0.3) * 100) + '%</span></div>'
                        + '</div>'
                        + '<hr>'
                        + '<div class="flex justify-between"><span>单独发送表情/颜文字</span><input type="checkbox" id="ch-separate-emoji-enabled" ' + (rs.separateEmojiEnabled ? 'checked' : '') + '></div>'
                        + '<div class="flex justify-between"><span>引用消息</span><input type="checkbox" id="ch-quote-enabled" ' + (rs.quoteEnabled ? 'checked' : '') + '></div>'
                        + '<div id="ch-quote-row"' + (rs.quoteEnabled ? '' : ' style="display:none"') + '>'
                        + '<div class="flex justify-between"><span>引用概率</span><input type="range" id="ch-quote-chance" min="0" max="100" value="' + Math.round((rs.quoteChance || 0.3) * 100) + '" class="w-24"><span id="ch-quote-label">' + Math.round((rs.quoteChance || 0.3) * 100) + '%</span></div>'
                        + '</div>'
                        + '<div class="flex justify-between"><span>拼字卡</span><input type="checkbox" id="ch-combine-cards-enabled" ' + (rs.combineCardsEnabled ? 'checked' : '') + '></div>'
                        + '<div id="ch-combine-cards-row"' + (rs.combineCardsEnabled ? '' : ' style="display:none"') + '>'
                        + '<div class="flex justify-between"><span>组合概率</span><input type="range" id="ch-combine-cards-chance" min="0" max="100" value="' + Math.round((rs.combineCardsChance || 0.3) * 100) + '" class="w-24"><span id="ch-combine-cards-chance-label">' + Math.round((rs.combineCardsChance || 0.3) * 100) + '%</span></div>'
                        + '<div class="flex justify-between"><span>组合字数</span><input type="number" id="ch-combine-cards-min" value="' + (rs.combineCardsMin || 2) + '" min="1" max="10" class="w-12 px-1 border rounded text-center">~<input type="number" id="ch-combine-cards-max" value="' + (rs.combineCardsMax || 4) + '" min="2" max="10" class="w-12 px-1 border rounded text-center"></div>'
                        + '</div>'
                        + '<div class="flex justify-between"><span>回复中拍一拍概率</span><input type="range" id="ch-reply-pat-chance" min="0" max="100" value="' + Math.round(rs.replyPatChance * 100) + '" class="w-24"><span id="ch-reply-pat-label">' + Math.round(rs.replyPatChance * 100) + '%</span></div>'
                        + '<div class="flex justify-between"><span>回复中通话概率</span><input type="range" id="ch-reply-call-chance" min="0" max="100" value="' + Math.round(rs.replyCallChance * 100) + '" class="w-24"><span id="ch-reply-call-label">' + Math.round(rs.replyCallChance * 100) + '%</span></div>'
                        + '<div class="flex justify-between"><span>回复中语音概率</span><input type="range" id="ch-voice-reply-chance" min="0" max="30" value="' + Math.round((rs.voiceReplyChance || 0.06) * 100) + '" class="w-24"><span id="ch-voice-reply-label">' + Math.round((rs.voiceReplyChance || 0.06) * 100) + '%</span></div>'
                        + '<hr>'
                        + '<div class="flex justify-between"><span>朋友圈评论延迟(分)</span><input type="number" id="ch-post-reply-min" value="' + Math.floor(rs.postReplyMin / 60) + '" class="w-14 px-1 border rounded text-center">~<input type="number" id="ch-post-reply-max" value="' + Math.floor(rs.postReplyMax / 3600) + '" class="w-14 px-1 border rounded text-center">小时</div>'
                        + '<div class="flex justify-between"><span>对方回复我的评论延迟(分)</span><input type="number" id="ch-comment-reply-min" value="' + Math.floor(rs.commentReplyMin / 60) + '" class="w-14 px-1 border rounded text-center">~<input type="number" id="ch-comment-reply-max" value="' + Math.floor(rs.commentReplyMax / 60) + '" class="w-14 px-1 border rounded text-center"></div>'
                        + '<hr>'
                        + '<div class="flex justify-between"><span>状态更新间隔(分)</span><input type="number" id="ch-status-min" value="' + rs.statusMin + '" class="w-12 px-1 border rounded text-center">~<input type="number" id="ch-status-max" value="' + rs.statusMax + '" class="w-12 px-1 border rounded text-center"></div>'
                        + '<button id="ch-save-reply-settings" class="w-full py-2 text-white rounded-lg text-sm" style="background:var(--theme)">保存</button></div>';

                    function rsv(key, val) { if (val !== undefined) rs[key] = val; return rs[key]; }
                    document.getElementById('ch-min-reply-time').addEventListener('input', function() {
                        var v = parseInt(this.value); rsv('minReplyTime', v);
                        document.getElementById('ch-min-reply-label').textContent = v + 's'; });
                    document.getElementById('ch-min-reply-dec').onclick = function() { var s = document.getElementById('ch-min-reply-time'); s.value = Math.max(1, parseInt(s.value) - 1); s.dispatchEvent(new Event('input')); };
                    document.getElementById('ch-min-reply-inc').onclick = function() { var s = document.getElementById('ch-min-reply-time'); s.value = Math.min(300, parseInt(s.value) + 1); s.dispatchEvent(new Event('input')); };
                    document.getElementById('ch-max-reply-time').addEventListener('input', function() {
                        var v = parseInt(this.value); rsv('maxReplyTime', v);
                        document.getElementById('ch-max-reply-label').textContent = v + 's'; });
                    document.getElementById('ch-max-reply-dec').onclick = function() { var s = document.getElementById('ch-max-reply-time'); s.value = Math.max(1, parseInt(s.value) - 1); s.dispatchEvent(new Event('input')); };
                    document.getElementById('ch-max-reply-inc').onclick = function() { var s = document.getElementById('ch-max-reply-time'); s.value = Math.min(3600, parseInt(s.value) + 1); s.dispatchEvent(new Event('input')); };
                    document.getElementById('ch-max-cards').onchange = function() { rsv('maxCardsPerReplyUser', parseInt(this.value) || 4); };
                    document.getElementById('ch-read-receipt-enabled').onchange = function() {
                        rsv('readReceiptEnabled', this.checked);
                        var row = document.getElementById('ch-read-receipt-row');
                        if (row) row.style.display = this.checked ? '' : 'none';
                    };
                    document.getElementById('ch-read-receipt-chance').oninput = function() {
                        rsv('readReceiptChance', parseInt(this.value) / 100);
                        document.getElementById('ch-read-receipt-label').textContent = this.value + '%'; };
                    document.getElementById('ch-active-msg-enabled').onchange = function() {
                        rsv('activeMsgEnabled', this.checked);
                        var row = document.getElementById('ch-active-msg-row');
                        if (row) row.style.display = this.checked ? '' : 'none';
                        startActiveMsgTimer();
                    };
                    document.getElementById('ch-active-msg-min').onchange = function() { rsv('activeMsgMin', parseInt(this.value) || 10); startActiveMsgTimer(); };
                    document.getElementById('ch-active-msg-max').onchange = function() { rsv('activeMsgMax', parseInt(this.value) || 60); startActiveMsgTimer(); };
                    document.getElementById('ch-letter-reply-min').onchange = function() { rsv('letterReplyMin', parseInt(this.value) * 60 || 3600); };
                    document.getElementById('ch-letter-reply-max').onchange = function() { rsv('letterReplyMax', parseInt(this.value) * 3600 || 86400); };
                    document.getElementById('ch-letter-card-min').onchange = function() { rsv('letterCardCountMin', parseInt(this.value) || 5); };
                    document.getElementById('ch-letter-card-max').onchange = function() { rsv('letterCardCountMax', parseInt(this.value) || 15); };
                    document.getElementById('ch-call-hangup-min').onchange = function() { rsv('callHangupMin', parseInt(this.value) || 2); };
                    document.getElementById('ch-call-hangup-max').onchange = function() { rsv('callHangupMax', parseInt(this.value) || 15); };
                    document.getElementById('ch-partner-call-chance').oninput = function() {
                        rsv('partnerCallChance', parseInt(this.value) / 100);
                        document.getElementById('ch-partner-call-label').textContent = this.value + '%';
                        startPartnerCallTimer(); };
                    document.getElementById('ch-partner-letter-enabled').onchange = function() {
                        rsv('partnerLetterEnabled', this.checked);
                        var row = document.getElementById('ch-partner-letter-row');
                        if (row) row.style.display = this.checked ? '' : 'none';
                        startPartnerLetterTimer();
                    };
                    document.getElementById('ch-partner-letter-min').onchange = function() { rsv('partnerLetterMin', parseInt(this.value) || 10); startPartnerLetterTimer(); };
                    document.getElementById('ch-partner-letter-max').onchange = function() { rsv('partnerLetterMax', parseInt(this.value) || 24); startPartnerLetterTimer(); };
                    document.getElementById('ch-partner-letter-chance').oninput = function() {
                        rsv('partnerLetterChance', parseInt(this.value) / 100);
                        document.getElementById('ch-partner-letter-label').textContent = this.value + '%';
                        startPartnerLetterTimer(); };
                    document.getElementById('ch-separate-emoji-enabled').onchange = function() { rsv('separateEmojiEnabled', this.checked); };
                    document.getElementById('ch-quote-enabled').onchange = function() {
                        rsv('quoteEnabled', this.checked);
                        var row = document.getElementById('ch-quote-row');
                        if (row) row.style.display = this.checked ? '' : 'none';
                    };
                    document.getElementById('ch-quote-chance').oninput = function() {
                        rsv('quoteChance', parseInt(this.value) / 100);
                        document.getElementById('ch-quote-label').textContent = this.value + '%'; };
                    document.getElementById('ch-combine-cards-enabled').onchange = function() {
                        rsv('combineCardsEnabled', this.checked);
                        var row = document.getElementById('ch-combine-cards-row');
                        if (row) row.style.display = this.checked ? '' : 'none';
                    };
                    document.getElementById('ch-combine-cards-chance').oninput = function() {
                        rsv('combineCardsChance', parseInt(this.value) / 100);
                        document.getElementById('ch-combine-cards-chance-label').textContent = this.value + '%'; };
                    document.getElementById('ch-combine-cards-min').onchange = function() { rsv('combineCardsMin', parseInt(this.value) || 2); };
                    document.getElementById('ch-combine-cards-max').onchange = function() { rsv('combineCardsMax', parseInt(this.value) || 4); };
                    document.getElementById('ch-reply-pat-chance').oninput = function() {
                        rsv('replyPatChance', parseInt(this.value) / 100);
                        document.getElementById('ch-reply-pat-label').textContent = this.value + '%'; };
                    document.getElementById('ch-reply-call-chance').oninput = function() {
                        rsv('replyCallChance', parseInt(this.value) / 100);
                        document.getElementById('ch-reply-call-label').textContent = this.value + '%'; };
                    document.getElementById('ch-voice-reply-chance').oninput = function() {
                        rsv('voiceReplyChance', parseInt(this.value) / 100);
                        document.getElementById('ch-voice-reply-label').textContent = this.value + '%'; };
                    document.getElementById('ch-post-reply-min').onchange = function() { rsv('postReplyMin', parseInt(this.value) * 60 || 300); };
                    document.getElementById('ch-post-reply-max').onchange = function() { rsv('postReplyMax', parseInt(this.value) * 3600 || 21600); };
                    document.getElementById('ch-comment-reply-min').onchange = function() { rsv('commentReplyMin', parseInt(this.value) * 60 || 180); };
                    document.getElementById('ch-comment-reply-max').onchange = function() { rsv('commentReplyMax', parseInt(this.value) * 60 || 1800); };
                    document.getElementById('ch-status-min').onchange = function() { rsv('statusMin', parseInt(this.value) || 5); startStatusTimersForAll(); };
                    document.getElementById('ch-status-max').onchange = function() { rsv('statusMax', parseInt(this.value) || 60); startStatusTimersForAll(); };

                    content.querySelector('#ch-save-reply-settings').onclick = function() {
                        updateContact(contact);
                        startActiveMsgTimer();
                        startPartnerLetterTimer();
                        startPartnerCallTimer();
                        startStatusTimersForAll();
                        showToast('回复设置已保存');
                        modal.classList.add('hidden');
                    };
                } else if (type === 'manage-emojis') {
                    title.textContent = '😊 专属表情 - ' + contact.name;
                    if (!contact.uniqueEmojis) contact.uniqueEmojis = [];
                    var html = '<div class="text-sm space-y-2">';
                    html += '<div class="grid grid-cols-4 gap-2">';
                    if (contact.uniqueEmojis.length) {
                        contact.uniqueEmojis.forEach(function(e, i) {
                            html += '<div class="relative"><img src="' + e.src + '" class="w-full aspect-square object-contain rounded border"><button class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-400 text-white text-xs flex items-center justify-center" data-emoji-idx="' + i + '">✕</button></div>';
                        });
                    } else {
                        html += '<div class="col-span-4 text-center text-[var(--text-secondary)] py-4">暂无专属表情</div>';
                    }
                    html += '</div>';
                    html += '<label for="ch-emoji-upload" class="block py-2 bg-[var(--theme-light)] rounded-lg text-center cursor-pointer text-xs">📷 上传表情</label>';
                    html += '<input type="file" id="ch-emoji-upload" accept="image/*" multiple class="hidden">';
                    html += '</div>';
                    content.innerHTML = html;
                    content.querySelector('#ch-emoji-upload').onchange = async function(e) {
                        var files = Array.from(e.target.files);
                        for (var f of files) {
                            var src = await compressImage(f, 120, 0.85);
                            if (src) contact.uniqueEmojis.push({ src: src });
                        }
                        await updateContact(contact);
                        openChSubModal('manage-emojis', contact);
                        showToast('已添加 ' + files.length + ' 个表情');
                    };
                    content.querySelectorAll('[data-emoji-idx]').forEach(function(btn) {
                        btn.onclick = function() {
                            var idx = parseInt(this.dataset.emojiIdx);
                            contact.uniqueEmojis.splice(idx, 1);
                            updateContact(contact);
                            openChSubModal('manage-emojis', contact);
                        };
                    });
                } else if (type === 'manage-voices') {
                    title.textContent = '🎤 专属语音 - ' + contact.name;
                    if (!contact.uniqueVoiceGroups) contact.uniqueVoiceGroups = [];
                    var html = '<div class="text-sm space-y-2">';
                    if (contact.uniqueVoiceGroups.length) {
                        contact.uniqueVoiceGroups.forEach(function(g, gi) {
                            html += '<div class="bg-[var(--theme-light)] rounded-lg p-2"><div class="flex items-center justify-between mb-1"><span class="text-xs font-medium">' + escapeHtml(g.name || '未命名') + '</span><button class="text-red-400 text-xs" data-del-group="' + gi + '">删除</button></div>';
                            if (g.items && g.items.length) {
                                g.items.forEach(function(v, vi) {
                                    html += '<div class="flex items-center justify-between py-1 px-2 bg-[var(--card-bg)] rounded mb-1"><span class="text-xs truncate flex-1">🔊 语音 ' + (vi + 1) + '</span><button class="text-red-400 text-xs" data-del-voice="' + gi + '-' + vi + '">✕</button></div>';
                                });
                            }
                            html += '</div>';
                        });
                    } else {
                        html += '<div class="text-center text-[var(--text-secondary)] py-4">暂无专属语音分组</div>';
                    }
                    html += '<div class="flex space-x-2"><input type="text" id="ch-new-voice-group" placeholder="新分组名" class="flex-1 px-2 py-1 border rounded text-xs"><button id="ch-add-voice-group" class="px-3 py-1 text-white rounded text-xs" style="background:var(--theme)">+分组</button></div>';
                    html += '<label for="ch-voice-upload" class="block py-2 bg-[var(--theme-light)] rounded-lg text-center cursor-pointer text-xs">🎤 上传语音文件（支持多选）</label>';
                    html += '<input type="file" id="ch-voice-upload" accept="audio/*" multiple class="hidden">';
                    html += '<label for="ch-batch-voice-upload" class="block py-2 bg-[var(--theme-light)] rounded-lg text-center cursor-pointer text-xs">📁 批量上传语音</label>';
                    html += '<input type="file" id="ch-batch-voice-upload" accept="audio/*" multiple class="hidden">';
                    html += '</div>';
                    content.innerHTML = html;
                    content.querySelector('#ch-add-voice-group').onclick = function() {
                        var name = content.querySelector('#ch-new-voice-group').value.trim();
                        if (!name) { showToast('请输入分组名'); return; }
                        if (!contact.uniqueVoiceGroups) contact.uniqueVoiceGroups = [];
                        contact.uniqueVoiceGroups.push({ name: name, items: [], enabled: true });
                        updateContact(contact);
                        openChSubModal('manage-voices', contact);
                    };
                    content.querySelector('#ch-voice-upload').onchange = async function(e) {
                        var groupName = prompt('选择目标分组：\n' + (contact.uniqueVoiceGroups || []).map(function(g, i) { return (i + 1) + '. ' + (g.name || '未命名'); }).join('\n') + '\n\n输入分组编号');
                        var idx = parseInt(groupName) - 1;
                        if (isNaN(idx) || !contact.uniqueVoiceGroups[idx]) { showToast('无效分组'); return; }
                        var files = Array.from(e.target.files);
                        for (var f of files) {
                            var reader = new FileReader();
                            reader.onload = function(ev) {
                                contact.uniqueVoiceGroups[idx].items.push({ src: ev.target.result, duration: 3 });
                                updateContact(contact);
                            };
                            reader.readAsDataURL(f);
                        }
                        showToast('已添加 ' + files.length + ' 个语音 ✅');
                        setTimeout(function() { openChSubModal('manage-voices', contact); }, 500);
                    };
                    content.querySelector('#ch-batch-voice-upload').onchange = async function(e) {
                        var groupName = prompt('选择目标分组：\n' + (contact.uniqueVoiceGroups || []).map(function(g, i) { return (i + 1) + '. ' + (g.name || '未命名'); }).join('\n') + '\n\n输入分组编号');
                        var idx = parseInt(groupName) - 1;
                        if (isNaN(idx) || !contact.uniqueVoiceGroups[idx]) { showToast('无效分组'); return; }
                        var files = Array.from(e.target.files);
                        var promises = files.map(function(f) {
                            return new Promise(function(resolve) {
                                var reader = new FileReader();
                                reader.onload = function(ev) {
                                    var audio = new Audio(ev.target.result);
                                    audio.onloadedmetadata = function() {
                                        contact.uniqueVoiceGroups[idx].items.push({ src: ev.target.result, duration: Math.round(audio.duration || 3) });
                                        resolve();
                                    };
                                    audio.onerror = function() {
                                        contact.uniqueVoiceGroups[idx].items.push({ src: ev.target.result, duration: 3 });
                                        resolve();
                                    };
                                };
                                reader.readAsDataURL(f);
                            });
                        });
                        await Promise.all(promises);
                        updateContact(contact);
                        showToast('批量上传 ' + files.length + ' 个语音 ✅');
                        setTimeout(function() { openChSubModal('manage-voices', contact); }, 500);
                    };
                    content.querySelectorAll('[data-del-group]').forEach(function(btn) {
                        btn.onclick = function() {
                            var gi = parseInt(this.dataset.delGroup);
                            if (confirm('删除此分组？')) {
                                contact.uniqueVoiceGroups.splice(gi, 1);
                                updateContact(contact);
                                openChSubModal('manage-voices', contact);
                            }
                        };
                    });
                    content.querySelectorAll('[data-del-voice]').forEach(function(btn) {
                        btn.onclick = function() {
                            var parts = this.dataset.delVoice.split('-');
                            var gi = parseInt(parts[0]), vi = parseInt(parts[1]);
                            contact.uniqueVoiceGroups[gi].items.splice(vi, 1);
                            updateContact(contact);
                            openChSubModal('manage-voices', contact);
                        };
                    });
                } else if (type === 'manage-wordcards') {
                    title.textContent = '📝 专属字卡 - ' + contact.name;
                    if (!contact.uniqueWordCardGroups) contact.uniqueWordCardGroups = [];
                    renderContactWordCardGroupsInModal(contact, content);
                }
            }

            function openExpandPanelSettings() {
                var contact = getCurrentContact();
                if (!contact) return;
                var modal = document.getElementById('ch-sub-modal');
                var title = document.getElementById('ch-sub-title');
                var content = document.getElementById('ch-sub-content');
                if (!modal || !title || !content) return;
                modal.classList.remove('hidden');
                title.textContent = '📋 设置展开面板按钮';
                var allItems = [
                    ['contact-list', '联系人'], ['video-call', '视频'], ['camera', '拍照'],
                    ['album', '相册'], ['mood', '心情'], ['period', '经期'],
                    ['moments', '朋友圈'], ['letter', '信箱'], ['appearance', '外观'],
                    ['pat', '拍一拍'], ['settings', '设置']
                ];
                var visible = contact.visibleExpItems || [];
                var h = '<div class="text-sm space-y-2">';
                allItems.forEach(function(item) {
                    var checked = visible.indexOf(item[0]) !== -1 ? 'checked' : '';
                    h += '<label class="flex items-center space-x-2 py-1"><input type="checkbox" data-action="' + item[0] + '" ' + checked + '> <span>' + item[1] + '</span></label>';
                });
                h += '<button id="save-expand-settings" class="w-full py-2 mt-2 text-white rounded-lg text-sm" style="background:var(--theme)">保存</button></div>';
                content.innerHTML = h;
                document.getElementById('save-expand-settings').onclick = function() {
                    var checks = content.querySelectorAll('[data-action]');
                    var newVisible = [];
                    checks.forEach(function(cb) { if (cb.checked) newVisible.push(cb.dataset.action); });
                    contact.visibleExpItems = newVisible;
                    updateContact(contact);
                    showToast('已保存');
                    modal.classList.add('hidden');
                };
            }

            function resetCallUI() {
                var ca = document.getElementById('call-active');
                if (ca) { ca.style.backgroundImage = ''; ca.style.backgroundSize = ''; ca.style.backgroundPosition = ''; }
                var mu = document.getElementById('mute-btn'); if (mu) { mu.style.background = ''; mu.style.border = ''; mu.innerHTML = '<i class="fa fa-microphone"></i>'; }
                var sp = document.getElementById('speaker-btn'); if (sp) { sp.style.background = ''; sp.style.border = ''; sp.innerHTML = '<i class="fa fa-volume-up"></i>'; }
                var ca = document.getElementById('camera-btn'); if (ca) { ca.style.background = ''; ca.style.border = ''; ca.innerHTML = '<i class="fa fa-video-camera"></i>'; }
                var pm = document.getElementById('pip-mute-btn'); if (pm) { pm.style.background = ''; pm.style.border = ''; pm.innerHTML = '<i class="fa fa-microphone"></i>'; }
            }

            function applyAvatarEffects() {
                var frameClasses = ['avatar-frame-glow', 'avatar-frame-thin', 'avatar-frame-double', 'avatar-frame-rainbow'];
                document.querySelectorAll('.header-avatar, #call-partner-avatar, #ch-avatar').forEach(function(av) {
                    if (settings.avatarFlow) av.classList.add('avatar-flowing'); else av.classList.remove('avatar-flowing');
                    if (settings.avatarSquare) av.classList.add('avatar-square'); else av.classList.remove('avatar-square');
                    if (settings.avatarFloat) av.classList.add('avatar-floating'); else av.classList.remove('avatar-floating');
                    frameClasses.forEach(function(cls) { av.classList.remove(cls); });
                    var frame = settings.avatarFrame || 'none';
                    var contact = getCurrentContact();
                    if (contact && contact.avatarFrame && contact.avatarFrame !== 'none') {
                        frame = contact.avatarFrame;
                    }
                    if (frame !== 'none') {
                        av.classList.add('avatar-frame-' + frame);
                    }
                    var customCss = settings.avatarCustomCSS || '';
                    if (contact && contact.avatarCustomCSS) {
                        customCss = contact.avatarCustomCSS;
                    }
                    if (customCss) {
                        av.style.cssText = customCss;
                    } else {
                        av.style.cssText = '';
                    }
                });
            }

            async function switchContact(contactId) {
                if (!document.body.classList.contains('home-view') && currentChatType === 'private' && currentContactId === contactId) return;
                if (currentChatType === 'private' && currentContactId) {
                    cachedContactMessages[currentContactId] = messages;
                    trimMessageCache();
                }
                clearReplyQueue();
                hideQuoteBar();
                currentChatType = 'private';
                currentGroupId = null;
                currentContactId = contactId;
                const c = getCurrentContact(); if (!c) return;
                document.getElementById('partner-avatar').src = c.avatar;
                var chPa = document.getElementById('ch-partner-avatar');
                if (chPa) chPa.src = c.avatar;
                document.getElementById('partner-name').textContent = c.name;
                document.getElementById('partner-status').textContent = c.status;
                var ptl = document.getElementById('partner-time-label');
                if (ptl) ptl.textContent = c.name;
                updateMoodIndexDisplay();
                updateHeaderBattery();
                updateMyMoodDisplay();
                updateHeaderClock();
                updateHeaderTimezone();
                startMoodIndexTimer();
                await loadCurrentContactData();
                updateChatBackground();
                startStatusTimersForAll();
                startActiveMsgTimer();
                schedulePartnerRead();
                document.body.classList.remove('home-view');
                var _hdr = document.getElementById('header'); if (_hdr) { _hdr.classList.remove('hidden'); _hdr.style.display = ''; }
                document.getElementById('chat-view').classList.add('open');
                var backBtn = document.getElementById('back-to-home-btn');
                if (backBtn) backBtn.classList.remove('hidden');
                document.getElementById('contact-switcher')?.classList.remove('hidden');
                document.querySelector('label[for="partner-avatar-upload"]')?.classList.remove('hidden');
                renderPatDrawer();
                renderMoodCalendar();
            }

            async function switchGroup(groupId) {
                if (!document.body.classList.contains('home-view') && currentChatType === 'group' && currentGroupId === groupId) return;
                if (currentChatType === 'private' && currentContactId) {
                    cachedContactMessages[currentContactId] = messages;
                    trimMessageCache();
                }
                clearReplyQueue();
                hideQuoteBar();
                currentChatType = 'group';
                currentContactId = null;
                currentGroupId = groupId;
                const g = getCurrentGroup(); if (!g) return;
                updateHeaderForGroup(g);
                groupMessages = await dbOp('readonly', 'groupMessages', store => store.index('groupId').getAll(groupId));
                messages = groupMessages;
                cachedGroupMessages[groupId] = groupMessages;
                renderMessages();
                scrollToBottom();
                markGroupMessagesRead();
                updateChatBackground();
                startActiveMsgTimer();
                document.body.classList.remove('home-view');
                var _hdr2 = document.getElementById('header'); if (_hdr2) { _hdr2.classList.remove('hidden'); _hdr2.style.display = ''; }
                document.getElementById('chat-view').classList.add('open');
                var backBtn = document.getElementById('back-to-home-btn');
                if (backBtn) backBtn.classList.remove('hidden');
                document.getElementById('contact-switcher')?.classList.remove('hidden');
                document.querySelector('label[for="partner-avatar-upload"]')?.classList.remove('hidden');
            }

            function updateHeaderForGroup(group) {
                document.getElementById('partner-avatar').src = group.avatar || 'https://picsum.photos/200/200?random=group';
                var chPa = document.getElementById('ch-partner-avatar');
                if (chPa) chPa.src = group.avatar || 'https://picsum.photos/200/200?random=group';
                document.getElementById('partner-name').textContent = group.name;
                var ptl = document.getElementById('partner-time-label');
                if (ptl) ptl.textContent = group.name;
                let h = '';
                group.members.slice(0, 4).forEach(mid => {
                    const c = contacts.find(c => c.id === mid);
                    if (c) h +=
                        `<img src="${escapeHtml(c.avatar)}" class="w-6 h-6 rounded-full border" onerror="this.src='https://picsum.photos/200/200?random=1'">`;
                });
                document.getElementById('partner-status').innerHTML =
                    `<div class="flex -space-x-1">${h}<span class="ml-1 text-xs">${group.members.length}人</span></div>`;
            }

            async function loadCurrentContactData() {
                if (!currentContactId) return;
                if (cachedContactMessages[currentContactId]) {
                    messages = cachedContactMessages[currentContactId];
                } else {
                    messages = await dbOp('readonly', 'messages', store => store.index('contactId').getAll(currentContactId));
                }
                letters = await dbOp('readonly', 'letters', store => store.index('contactId').getAll(currentContactId));
                try { posts = await getAllData('posts'); } catch (e) { posts = []; }
                renderMessages();
                renderLetterList();
            }

            function updateMessageReadStatus(msgId, isRead, isMe) {
                const el = chatContainer.querySelector(`[data-id="${msgId}"]`);
                if (!el) return;
                const readSpan = el.querySelector('.read-status') || el.querySelector('.group-message-read-status');
                if (readSpan) {
                    if (isMe) { readSpan.innerHTML = isRead ? '✓✓' : '✓';
                        readSpan.className = `text-xs ml-1 ${isRead ? 'text-blue-400' : 'text-gray-400'}`; } else { readSpan
                            .innerHTML = isRead ? '' : '●';
                        readSpan.className = `text-xs ml-1 ${isRead ? 'text-gray-400' : 'text-blue-400'}`; }
                }
            }

            async function markGroupMessagesRead() {
                if (currentChatType !== 'group' || !currentGroupId) return;
                const unreadMsgs = groupMessages.filter(m => m.senderId !== 'me' && !m.read);
                if (!unreadMsgs.length) return;
                for (const m of unreadMsgs) {
                    m.read = true;
                    await updateData('groupMessages', m);
                    updateMessageReadStatus(m.id, true, false);
                }
            }

            function createVoiceBubble(msg, isMe) {
                const duration = msg.duration || 0;
                const mins = Math.floor(duration / 60);
                const secs = Math.floor(duration % 60);
                const durStr = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}"`;
                const waveBars = [0, 1, 2, 3, 4].map(i => `<span class="wave-bar" style="height:${4+Math.random()*14}px;"></span>`).join('');
                const bubble = document.createElement('div');
                bubble.className = `voice-bubble ${isMe ? 'me' : 'you'} card-shadow`;
                bubble.innerHTML = `
              <span class="play-icon"><i class="fa fa-play"></i></span>
              <span class="voice-wave">${waveBars}</span>
              <span class="voice-duration">${durStr}</span>
              ${!msg.read && !isMe ? '<span class="voice-unread-dot"></span>' : ''}
            `;
                bubble.dataset.msgId = msg.id;
                bubble.dataset.duration = duration;
                bubble.dataset.src = msg.src || '';
                bubble.onclick = function(e) { e.stopPropagation();
                    toggleVoicePlayback(bubble, msg); };
                return bubble;
            }

            function stopAllVoicePlayback() {
                if (currentlyPlayingVoice) {
                    const audio = currentlyPlayingVoice.audio;
                    if (audio) { audio.pause();
                        audio.currentTime = 0; }
                    const bubble = currentlyPlayingVoice.bubble;
                    if (bubble) {
                        bubble.classList.remove('voice-playing');
                        const icon = bubble.querySelector('.play-icon i');
                        if (icon) { icon.className = 'fa fa-play'; }
                        const dot = bubble.querySelector('.voice-unread-dot');
                        if (dot) dot.style.display = 'none';
                    }
                    currentlyPlayingVoice = null;
                }
                voiceAutoPlayQueue = [];
            }

            function toggleVoicePlayback(bubble, msg) {
                if (currentlyPlayingVoice && currentlyPlayingVoice.bubble === bubble && currentlyPlayingVoice.audio && !currentlyPlayingVoice.audio.paused) {
                    currentlyPlayingVoice.audio.pause();
                    bubble.classList.remove('voice-playing');
                    const icon = bubble.querySelector('.play-icon i');
                    if (icon) icon.className = 'fa fa-play';
                    currentlyPlayingVoice = null;
                    return;
                }
                stopAllVoicePlayback();
                const src = bubble.dataset.src || msg.src;
                if (!src) return;
                const audio = new Audio(src);
                audio.onloadedmetadata = () => {
                    audio.play().catch(() => {});
                    bubble.classList.add('voice-playing');
                    const icon = bubble.querySelector('.play-icon i');
                    if (icon) icon.className = 'fa fa-pause';
                    const dot = bubble.querySelector('.voice-unread-dot');
                    if (dot) dot.style.display = 'none';
                    if (!msg.read) {
                        msg.read = true;
                        const store = currentChatType === 'group' ? 'groupMessages' : 'messages';
                        updateData(store, msg);
                        updateMessageReadStatus(msg.id, true, msg.isMe || msg.senderId === 'me');
                    }
                    currentlyPlayingVoice = { audio, bubble, msg };
                    audio.onended = () => {
                        bubble.classList.remove('voice-playing');
                        const ic = bubble.querySelector('.play-icon i');
                        if (ic) ic.className = 'fa fa-play';
                        currentlyPlayingVoice = null;
                        playNextInQueue();
                    };
                };
                audio.onerror = () => { showToast('语音加载失败');
                    currentlyPlayingVoice = null;
                    playNextInQueue(); };
            }

            function playNextInQueue() {
                if (voiceAutoPlayQueue.length === 0) return;
                const next = voiceAutoPlayQueue.shift();
                if (next && next.bubble) {
                    setTimeout(() => toggleVoicePlayback(next.bubble, next.msg), 300);
                }
            }

            function createPrivateMessageElement(msg) {
                if (msg.recalled) {
                    var rd = document.createElement('div');
                    rd.className = 'flex justify-center w-full my-1';
                    rd.dataset.id = msg.id;
                    var by = msg.isMe ? '你' : (getCurrentContact()?.name || 'TA');
                    rd.innerHTML = '<span class="text-xs text-[var(--text-secondary)] msg-recalled">' + escapeHtml(by) + ' 撤回了一条消息</span>';
                    return rd;
                }
                if (msg.type === 'call') {
                    const div = document.createElement('div');
                    div.className = 'flex justify-center w-full my-2';
                    div.dataset.id = msg.id;
                    div.innerHTML =
                        `<span class="text-xs text-[var(--text-secondary)] bg-[var(--card-bg)] px-3 py-1.5 rounded-xl" style="white-space:pre-wrap;text-align:center;line-height:1.6;max-width:90%;">${escapeHtml(msg.text)}</span>`;
                    return div;
                }
                if (msg.type === 'pat') {
                    const div = document.createElement('div');
                    div.className = 'flex justify-center w-full my-1';
                    div.dataset.id = msg.id;
                    const displayName = msg.isMe ? settings.myName : (getCurrentContact()?.name || 'TA');
                    div.innerHTML =
                        `<span class="text-xs text-[var(--text-secondary)] bg-[var(--card-bg)] px-3 py-1 rounded-full pat-anim">${escapeHtml(displayName)} ${escapeHtml(msg.text)}</span>`;
                    return div;
                }
                if (msg.type === 'date-separator') {
                    const div = document.createElement('div');
                    div.className = 'flex justify-center w-full my-2';
                    div.dataset.id = msg.id;
                    div.innerHTML = `<span class="date-separator">${escapeHtml(msg.text)}</span>`;
                    return div;
                }
                if (msg.type === 'voice') {
                    const div = document.createElement('div');
                    div.className = `flex ${msg.isMe ? 'justify-end' : 'justify-start'}`;
                    div.dataset.id = msg.id;
                    const avatar = msg.isMe ? settings.myAvatar : getCurrentContact()?.avatar || 'https://picsum.photos/200/200?random=1';
                    const voiceBubble = createVoiceBubble(msg, msg.isMe);
                    div.innerHTML = '';
                    const wrapper = document.createElement('div');
                    wrapper.className = 'flex items-end space-x-2 max-w-[82%]';
                    if (!msg.isMe) {
                        const av = document.createElement('img');
                        av.className = 'w-7 h-7 rounded-full';
                        av.src = avatar;
                        av.onerror = () => { av.src = 'https://picsum.photos/200/200?random=1'; };
                        wrapper.appendChild(av);
                    }
                    const innerWrap = document.createElement('div');
                    innerWrap.appendChild(voiceBubble);
                    const metaDiv = document.createElement('div');
                    metaDiv.className = 'flex justify-end items-center mt-0.5 space-x-2 px-1';
                    const readIcon = msg.isMe ? (msg.read ? '✓✓' : '✓') : (msg.read ? '' : '●');
                    const readClass = msg.isMe ? (msg.read ? 'text-blue-400' : 'text-gray-400') : (msg.read ? 'text-gray-400' : 'text-blue-400');
                    metaDiv.innerHTML = `<span class="text-xs text-[var(--text-secondary)]">${formatTime(msg.timestamp)}</span><span class="read-status text-xs ml-1 ${readClass}">${readIcon}</span><button class="quote-btn text-xs text-[var(--text-secondary)]" data-msgid="${msg.id}"><i class="fa fa-reply"></i></button><button class="delete-btn text-xs text-[var(--text-secondary)] hover:text-red-400" data-msgid="${msg.id}"><i class="fa fa-trash"></i></button><button class="recall-btn text-xs text-[var(--text-secondary)] hover:text-orange-400" data-msgid="${msg.id}"><i class="fa fa-undo"></i></button>`;
                    innerWrap.appendChild(metaDiv);
                    wrapper.appendChild(innerWrap);
                    if (msg.isMe) {
                        const meAvatar = document.createElement('img');
                        meAvatar.src = avatar;
                        meAvatar.className = 'w-7 h-7 rounded-full';
                        meAvatar.onerror = () => { meAvatar.src = 'https://picsum.photos/200/200?random=2'; };
                        wrapper.appendChild(meAvatar);
                    }
                    div.appendChild(wrapper);
                    if (!msg.read && !msg.isMe) {
                        voiceAutoPlayQueue.push({ bubble: voiceBubble, msg });
                    }
                    return div;
                }
                if (msg.type === 'image') {
                    const div = document.createElement('div');
                    div.className = `flex ${msg.isMe ? 'justify-end' : 'justify-start'}`;
                    div.dataset.id = msg.id;
                    const avatar = msg.isMe ? settings.myAvatar : getCurrentContact()?.avatar || 'https://picsum.photos/200/200?random=1';
                    const wrapper = document.createElement('div');
                    wrapper.className = 'flex items-end space-x-2 max-w-[82%]';
                    if (!msg.isMe) {
                        const av = document.createElement('img');
                        av.className = 'w-7 h-7 rounded-full';
                        av.src = avatar;
                        av.onerror = () => { av.src = 'https://picsum.photos/200/200?random=1'; };
                        wrapper.appendChild(av);
                    }
                    const innerWrap = document.createElement('div');
                    const img = document.createElement('img');
                    img.src = msg.src;
                    img.className = 'image-no-bubble';
                    img.style.maxWidth = '120px';
                    img.style.maxHeight = '120px';
                    img.style.borderRadius = '12px';
                    img.style.objectFit = 'contain';
                    img.style.cursor = 'zoom-in';
                    img.onclick = function(e) { e.stopPropagation(); showImageLightbox(msg.src); };
                    innerWrap.appendChild(img);
                    const metaDiv = document.createElement('div');
                    metaDiv.className = 'flex justify-end items-center mt-0.5 space-x-2 px-1';
                    const readIcon = msg.isMe ? (msg.read ? '✓✓' : '✓') : (msg.read ? '' : '●');
                    const readClass = msg.isMe ? (msg.read ? 'text-blue-400' : 'text-gray-400') : (msg.read ? 'text-gray-400' : 'text-blue-400');
                    metaDiv.innerHTML = `<span class="text-xs text-[var(--text-secondary)]">${formatTime(msg.timestamp)}</span><span class="read-status text-xs ml-1 ${readClass}">${readIcon}</span><button class="quote-btn text-xs text-[var(--text-secondary)]" data-msgid="${msg.id}"><i class="fa fa-reply"></i></button><button class="delete-btn text-xs text-[var(--text-secondary)] hover:text-red-400" data-msgid="${msg.id}"><i class="fa fa-trash"></i></button><button class="recall-btn text-xs text-[var(--text-secondary)] hover:text-orange-400" data-msgid="${msg.id}"><i class="fa fa-undo"></i></button>`;
                    innerWrap.appendChild(metaDiv);
                    wrapper.appendChild(innerWrap);
                    if (msg.isMe) {
                        const meAvatar = document.createElement('img');
                        meAvatar.src = avatar;
                        meAvatar.className = 'w-7 h-7 rounded-full';
                        meAvatar.onerror = () => { meAvatar.src = 'https://picsum.photos/200/200?random=2'; };
                        wrapper.appendChild(meAvatar);
                    }
                    div.appendChild(wrapper);
                    return div;
                }
                const div = document.createElement('div');
                div.className = `flex ${msg.isMe ? 'justify-end' : 'justify-start'}`;
                div.dataset.id = msg.id;
                const contact = getCurrentContact();
                const avatar = msg.isMe ? settings.myAvatar : contact?.avatar || 'https://picsum.photos/200/200?random=1';
                const bubble = msg.isMe ? 'message-bubble-right' : 'message-bubble-left';
                let qHtml = '';
                if (msg.quote) {
                    var qJumpId = msg.quote.id || '';
                    qHtml =
                        `<div class="border-l-2 opacity-60 pl-2 mb-1 text-xs cursor-pointer hover:opacity-90 quote-jump" style="border-color:var(--theme);" data-jump="${qJumpId}"><p class="font-medium">${escapeHtml(msg.quote.author)}</p><p class="truncate">${escapeHtml(msg.quote.text)}</p></div>`;
                }
                let cHtml = '';
                if (msg.type === 'text') cHtml = `<p class="break-words text-sm">${escapeHtml(msg.text)}</p>`;
                const readIcon =
                    `<span class="read-status text-xs ml-1 ${msg.read ? (msg.isMe ? 'text-blue-400' : 'text-gray-400') : (msg.isMe ? 'text-gray-400' : 'text-blue-400')}">${msg.isMe ? (msg.read ? '✓✓' : '✓') : (msg.read ? '' : '●')}</span>`;
                div.innerHTML =
                    `<div class="flex items-end space-x-2 max-w-[82%]">${!msg.isMe ? `<img src="${escapeHtml(avatar)}" class="w-7 h-7 rounded-full" onerror="this.src='https://picsum.photos/200/200?random=1'">` : ''}<div><div class="${bubble} px-3.5 py-2.5 card-shadow">${qHtml}${cHtml}</div><div class="flex justify-end items-center mt-0.5 space-x-2 px-1"><span class="text-xs text-[var(--text-secondary)]">${formatTime(msg.timestamp)}${readIcon}</span><button class="quote-btn text-xs text-[var(--text-secondary)]" data-msgid="${msg.id}"><i class="fa fa-reply"></i></button><button class="delete-btn text-xs text-[var(--text-secondary)] hover:text-red-400" data-msgid="${msg.id}"><i class="fa fa-trash"></i></button><button class="recall-btn text-xs text-[var(--text-secondary)] hover:text-orange-400" data-msgid="${msg.id}"><i class="fa fa-undo"></i></button></div></div>${msg.isMe ? `<img src="${escapeHtml(avatar)}" class="w-7 h-7 rounded-full" onerror="this.src='https://picsum.photos/200/200?random=2'">` : ''}</div>`;
                return div;
            }

            function createGroupMessageElement(msg, hideAvatarAndName = false) {
                if (msg.recalled) {
                    var rd = document.createElement('div');
                    rd.className = 'flex justify-center w-full my-1';
                    rd.dataset.id = msg.id;
                    var by = msg.senderId === 'me' ? '你' : (contacts.find(function(c) { return c.id === msg.senderId; })?.name || 'TA');
                    rd.innerHTML = '<span class="text-xs text-[var(--text-secondary)] msg-recalled">' + escapeHtml(by) + ' 撤回了一条消息</span>';
                    return rd;
                }
                if (msg.type === 'date-separator') {
                    const div = document.createElement('div');
                    div.className = 'flex justify-center w-full my-2';
                    div.dataset.id = msg.id;
                    div.innerHTML = `<span class="date-separator">${escapeHtml(msg.text)}</span>`;
                    return div;
                }
                if (msg.type === 'call') {
                    const div = document.createElement('div');
                    div.className = 'flex justify-center w-full my-2';
                    div.dataset.id = msg.id;
                    div.innerHTML =
                        `<span class="text-xs text-[var(--text-secondary)] bg-[var(--card-bg)] px-3 py-1.5 rounded-xl" style="white-space:pre-wrap;text-align:center;line-height:1.6;max-width:90%;">${escapeHtml(msg.text)}</span>`;
                    return div;
                }
                if (msg.type === 'pat') {
                    const div = document.createElement('div');
                    div.className = 'flex justify-center w-full my-2';
                    div.dataset.id = msg.id;
                    const sender = msg.senderId === 'me' ? settings.myName : contacts.find(c => c.id === msg.senderId)?.name || '未知';
                    div.innerHTML =
                        `<span class="text-xs text-[var(--text-secondary)] bg-[var(--card-bg)] px-3 py-1 rounded-full pat-anim">${escapeHtml(sender)} ${escapeHtml(msg.text)}</span>`;
                    return div;
                }
                if (msg.type === 'voice') {
                    const div = document.createElement('div');
                    div.dataset.id = msg.id;
                    const isMe = msg.senderId === 'me';
                    const sender = isMe ? { name: settings.myName, avatar: settings.myAvatar } : contacts.find(c => c.id === msg.senderId) || { name: '未知', avatar: 'https://picsum.photos/200/200?random=1' };
                    div.className = `flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`;
                    const wrapper = document.createElement('div');
                    wrapper.className = 'flex items-end space-x-2 max-w-[82%]';
                    if (!isMe) {
                        const av = document.createElement('img');
                        av.src = sender.avatar;
                        av.className = 'w-7 h-7 rounded-full';
                        av.onerror = () => { av.src = 'https://picsum.photos/200/200?random=1'; };
                        wrapper.appendChild(av);
                    }
                    const innerWrap = document.createElement('div');
                    if (!isMe && !hideAvatarAndName) {
                        const nameP = document.createElement('p');
                        nameP.className = 'text-xs text-[var(--text-secondary)] mb-1';
                        nameP.textContent = sender.name;
                        innerWrap.appendChild(nameP);
                    }
                    const voiceBubble = createVoiceBubble(msg, isMe);
                    innerWrap.appendChild(voiceBubble);
                    const metaDiv = document.createElement('div');
                    metaDiv.className = 'flex justify-end items-center mt-0.5 space-x-2 px-1';
                    const readStatusClass = msg.read ? 'read' : 'unread';
                    const readStatusText = msg.read ? '✓✓' : '✓';
                    metaDiv.innerHTML = `<span class="text-xs text-[var(--text-secondary)]">${formatTime(msg.timestamp)}</span><span class="group-message-read-status ${readStatusClass}">${readStatusText}</span><button class="quote-btn text-xs text-[var(--text-secondary)]" data-msgid="${msg.id}"><i class="fa fa-reply"></i></button>${isMe ? '<button class="delete-btn text-xs text-[var(--text-secondary)] hover:text-red-400" data-msgid="' + msg.id + '"><i class="fa fa-trash"></i></button>' : ''}<button class="recall-btn text-xs text-[var(--text-secondary)] hover:text-orange-400" data-msgid="${msg.id}"><i class="fa fa-undo"></i></button>`;
                    innerWrap.appendChild(metaDiv);
                    wrapper.appendChild(innerWrap);
                    if (isMe) {
                        const meAv = document.createElement('img');
                        meAv.src = sender.avatar;
                        meAv.className = 'w-7 h-7 rounded-full';
                        meAv.onerror = () => { meAv.src = 'https://picsum.photos/200/200?random=2'; };
                        wrapper.appendChild(meAv);
                    }
                    div.appendChild(wrapper);
                    if (!msg.read && !isMe) {
                        voiceAutoPlayQueue.push({ bubble: voiceBubble, msg });
                    }
                    return div;
                }
                if (msg.type === 'image') {
                    const div = document.createElement('div');
                    div.dataset.id = msg.id;
                    const isMe = msg.senderId === 'me';
                    const sender = isMe ? { name: settings.myName, avatar: settings.myAvatar } : contacts.find(c => c.id === msg.senderId) || { name: '未知', avatar: 'https://picsum.photos/200/200?random=1' };
                    div.className = `flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`;
                    const wrapper = document.createElement('div');
                    wrapper.className = 'flex items-end space-x-2 max-w-[82%]';
                    if (!isMe && !hideAvatarAndName) {
                        const av = document.createElement('img');
                        av.src = sender.avatar;
                        av.className = 'w-7 h-7 rounded-full';
                        av.onerror = () => { av.src = 'https://picsum.photos/200/200?random=1'; };
                        wrapper.appendChild(av);
                    } else if (!isMe && hideAvatarAndName) {
                        const spacer = document.createElement('div');
                        spacer.className = 'w-7 h-7';
                        wrapper.appendChild(spacer);
                    }
                    const innerWrap = document.createElement('div');
                    if (!isMe && !hideAvatarAndName) {
                        const nameP = document.createElement('p');
                        nameP.className = 'text-xs text-[var(--text-secondary)] mb-1';
                        nameP.textContent = sender.name;
                        innerWrap.appendChild(nameP);
                    }
                    const img = document.createElement('img');
                    img.src = msg.src;
                    img.className = 'image-no-bubble';
                    img.style.maxWidth = '120px';
                    img.style.maxHeight = '120px';
                    img.style.borderRadius = '12px';
                    img.style.objectFit = 'contain';
                    img.style.cursor = 'zoom-in';
                    img.onclick = function(e) { e.stopPropagation(); showImageLightbox(msg.src); };
                    innerWrap.appendChild(img);
                    const metaDiv = document.createElement('div');
                    metaDiv.className = 'flex justify-end items-center mt-0.5 space-x-2 px-1';
                    const readStatusClass = msg.read ? 'read' : 'unread';
                    const readStatusText = msg.read ? '✓✓' : '✓';
                    metaDiv.innerHTML = `<span class="text-xs text-[var(--text-secondary)]">${formatTime(msg.timestamp)}</span><span class="group-message-read-status ${readStatusClass}">${readStatusText}</span><button class="quote-btn text-xs text-[var(--text-secondary)]" data-msgid="${msg.id}"><i class="fa fa-reply"></i></button>${isMe ? '<button class="delete-btn text-xs text-[var(--text-secondary)] hover:text-red-400" data-msgid="' + msg.id + '"><i class="fa fa-trash"></i></button>' : ''}<button class="recall-btn text-xs text-[var(--text-secondary)] hover:text-orange-400" data-msgid="${msg.id}"><i class="fa fa-undo"></i></button>`;
                    innerWrap.appendChild(metaDiv);
                    wrapper.appendChild(innerWrap);
                    if (isMe) {
                        const meAv = document.createElement('img');
                        meAv.src = sender.avatar;
                        meAv.className = 'w-7 h-7 rounded-full';
                        meAv.onerror = () => { meAv.src = 'https://picsum.photos/200/200?random=2'; };
                        wrapper.appendChild(meAv);
                    }
                    div.appendChild(wrapper);
                    return div;
                }
                const div = document.createElement('div');
                div.dataset.id = msg.id;
                const isMe = msg.senderId === 'me';
                const sender = isMe ? { name: settings.myName, avatar: settings.myAvatar } : contacts.find(c => c.id === msg.senderId) || { name: '未知', avatar: 'https://picsum.photos/200/200?random=1' };
                const bubbleClass = isMe ? 'message-bubble-right' : 'message-bubble-left';
                div.className = `flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`;
                let quoteHtml = '';
                if (msg.quote) {
                    const qAuthor = msg.quote.senderId === 'me' ? settings.myName : (contacts.find(c => c.id === msg.quote.senderId)?.name || '未知');
                    const qText = msg.quote.type === 'text' ? msg.quote.text : (msg.quote.type === 'image' ? '[图片]' : (msg.quote.type === 'voice' ? '[语音]' : '[消息]'));
                    const qJumpId = msg.quote.id || '';
                    quoteHtml =
                        `<div class="group-quote cursor-pointer hover:opacity-80 quote-jump" data-jump="${qJumpId}"><p class="font-medium">${escapeHtml(qAuthor)}</p><p class="truncate">${escapeHtml(qText)}</p></div>`;
                }
                let contentHtml = '';
                if (msg.type === 'text') contentHtml = `<p class="break-words text-sm">${escapeHtml(msg.text)}</p>`;
                const readStatusClass = msg.read ? 'read' : 'unread';
                const readStatusText = msg.read ? '✓✓' : '✓';
                div.innerHTML = `
              <div class="flex items-end space-x-2 max-w-[82%]">
                ${(!isMe && !hideAvatarAndName) ? `<img src="${escapeHtml(sender.avatar)}" class="w-7 h-7 rounded-full" onerror="this.src='https://picsum.photos/200/200?random=1'">` : (!isMe ? `<div class="w-7 h-7"></div>` : '')}
                <div>
                  ${(!isMe && !hideAvatarAndName) ? `<p class="text-xs text-[var(--text-secondary)] mb-1">${escapeHtml(sender.name)}</p>` : ''}
                  <div class="${bubbleClass} px-3.5 py-2.5 card-shadow">${quoteHtml}${contentHtml}</div>
                  <div class="flex justify-end items-center mt-0.5 space-x-2 px-1">
                    <span class="text-xs text-[var(--text-secondary)]">${formatTime(msg.timestamp)}</span>
                    <span class="group-message-read-status ${readStatusClass}">${readStatusText}</span>
                    <button class="quote-btn text-xs text-[var(--text-secondary)]" data-msgid="${msg.id}"><i class="fa fa-reply"></i></button>
                    ${isMe ? '<button class="delete-btn text-xs text-[var(--text-secondary)] hover:text-red-400" data-msgid="' + msg.id + '"><i class="fa fa-trash"></i></button>' : ''}
                    <button class="recall-btn text-xs text-[var(--text-secondary)] hover:text-orange-400" data-msgid="${msg.id}"><i class="fa fa-undo"></i></button>
                  </div>
                </div>
                ${isMe ? `<img src="${escapeHtml(sender.avatar)}" class="w-7 h-7 rounded-full" onerror="this.src='https://picsum.photos/200/200?random=2'">` : ''}
              </div>`;
                return div;
            }

            function createMessageElement(msg, hideAvatarAndName = false) {
                return currentChatType === 'group' ? createGroupMessageElement(msg, hideAvatarAndName) : createPrivateMessageElement(msg);
            }

            function appendMessageToChat(msg) {
                var el = createMessageElement(msg, false);
                chatContainer.appendChild(el);
                postProcessMsgActions(el, msg);
                if (!msg.isMe && msg.type !== 'pat' && msg.type !== 'call' && msg.type !== 'voice' && currentChatType !== 'group') {
                    schedulePartnerRecall(msg);
                }
                scrollToBottom();
            }

            function schedulePartnerRecall(msg) {
                var msgs = messages;
                var last10 = msgs.slice(-10);
                if (last10.indexOf(msg) === -1) return;
                var delay = 15000 + Math.random() * 30000;
                setTimeout(function() {
                    if (msg.recalled) return;
                    if (Math.random() < 0.02) {
                        recallMessage(msg.id);
                    }
                }, delay);
            }

            function recallMessage(msgId) {
                var store = currentChatType === 'group' ? 'groupMessages' : 'messages';
                var msgs = currentChatType === 'group' ? groupMessages : messages;
                var msg = msgs.find(function(m) { return m.id === msgId; });
                if (!msg || msg.recalled) return;
                msg.recalled = true;
                msg.originalText = msg.text;
                msg.text = '[消息已撤回]';
                updateData(store, msg);
                var el = chatContainer.querySelector('[data-id="' + msgId + '"]');
                if (el) {
                    var newEl = createMessageElement(msg, false);
                    el.parentNode.replaceChild(newEl, el);
                    postProcessMsgActions(newEl, msg);
                }
            }

            function postProcessMsgActions(el, msg) {
                var metaDiv = el.querySelector('.space-x-2.px-1');
                if (!metaDiv) return;
                var btns = metaDiv.querySelectorAll('.quote-btn, .delete-btn, .recall-btn');
                if (!btns.length) return;
                var container = document.createElement('div');
                container.className = 'msg-actions';
                btns.forEach(function(btn) { container.appendChild(btn); });
                metaDiv.appendChild(container);
            }

            function renderMessages() {
                chatContainer.innerHTML = '';
                let lastSenderId = null;
                let lastSenderTimestamp = null;
                let lastDateStr = null;
                const msgsToRender = messages.filter(m => m.type !== 'letter');
                const displayMsgs = [];
                for (let i = 0; i < msgsToRender.length; i++) {
                    const m = msgsToRender[i];
                    const currentDateStr = formatDateShort(m.timestamp);
                    if (lastDateStr && lastDateStr !== currentDateStr) {
                        displayMsgs.push({ type: 'date-separator', text: currentDateStr, timestamp: m.timestamp, id: 'sep-' +
                                i });
                    }
                    lastDateStr = currentDateStr;
                    displayMsgs.push(m);
                }
                displayMsgs.forEach((m, idx) => {
                    if (m.type === 'date-separator') {
                        const el = createMessageElement(m, false);
                        chatContainer.appendChild(el);
                        return;
                    }
                    let hideAvatarAndName = false;
                    if (currentChatType === 'group' && m.senderId !== 'me') {
                        if (lastSenderId === m.senderId && lastSenderTimestamp) {
                            const diff = new Date(m.timestamp).getTime() - new Date(lastSenderTimestamp).getTime();
                            if (diff < 60000) hideAvatarAndName = true;
                        }
                        lastSenderId = m.senderId;
                        lastSenderTimestamp = m.timestamp;
                    }
                    const el = createMessageElement(m, hideAvatarAndName);
                    chatContainer.appendChild(el);
                    postProcessMsgActions(el, m);
                });
                scrollToBottom();
                setTimeout(() => {
                    const unreadVoices = displayMsgs.filter(m => m.type === 'voice' && !m.read && (m.senderId !== 'me' && !m
                        .isMe));
                    if (unreadVoices.length > 0 && voiceAutoPlayQueue.length === 0) {
                        unreadVoices.forEach(m => {
                            const bubble = chatContainer.querySelector(`.voice-bubble[data-msg-id="${m.id}"]`) || chatContainer
                                .querySelector(`[data-id="${m.id}"] .voice-bubble`);
                            if (bubble) voiceAutoPlayQueue.push({ bubble, msg: m });
                        });
                        if (voiceAutoPlayQueue.length > 0) playNextInQueue();
                    }
                }, 500);
            }

            async function sendMessage() {
                var mi = document.getElementById('message-input');
                if (!mi) return;
                const text = mi.value.trim();
                if (!text) return;
                if (text.startsWith('/')) {
                    var keyword = text.slice(1).toLowerCase();
                    var matched = getAllEmojiChars().concat(getAllKaomoji()).filter(function(e) { return e.indexOf(keyword) !== -1 || keyword.indexOf(e) !== -1; });
                    if (matched.length > 0) {
                        messageInput.value = matched[Math.floor(Math.random() * matched.length)];
                        var sb = document.getElementById('send-btn'); if (sb) sb.classList.remove('hidden');
                    } else {
                    showToast('未找到匹配的表情');
                    messageInput.value = '';
                    var sb = document.getElementById('send-btn'); if (sb) sb.classList.add('hidden');
                }
                messageInput.style.height = 'auto';
                return;
                }
                if (currentChatType === 'group') {
                    const quote = quotedMessage ? { id: quotedMessage.id, senderId: quotedMessage.senderId, type: quotedMessage.type, text: quotedMessage
                            .text } : null;
                    await sendGroupMessage(text, 'text', null, quote);
                } else {
                    const contact = getCurrentContact();
                    if (!contact) return;
                    const msg = {
                        type: 'text',
                        text,
                        isMe: true,
                        timestamp: new Date().toISOString(),
                        quote: quotedMessage ? { id: quotedMessage.id, author: document.getElementById('quote-author').textContent, text: document
                                .getElementById('quote-text').textContent } : null,
                        read: false,
                        contactId: currentContactId
                    };
                    const id = await addData('messages', msg);
                    msg.id = id;
                    messages.push(msg);
                    appendMessageToChat(msg);
                    messageInput.value = '';
                    messageInput.style.height = 'auto';
                    var sb = document.getElementById('send-btn'); if (sb) sb.classList.add('hidden');
                    hideQuoteBar();
                    scheduleMyRead(msg.id);
                    triggerUnifiedReply();
                }
            }

            async function sendGroupMessage(text, type = 'text', src = null, quote = null) {
                const group = getCurrentGroup();
                if (!group || (!text && type !== 'image' && type !== 'voice')) return;
                const finalQuote = (type === 'pat' || type === 'voice') ? null : quote;
                const msg = { type, text: (text || '').trim(), src, senderId: 'me', timestamp: new Date().toISOString(), read: true,
                    groupId: currentGroupId, quote: finalQuote, duration: 0 };
                const id = await addData('groupMessages', msg);
                msg.id = id;
                groupMessages.push(msg);
                messages = groupMessages;
                if (currentGroupId) cachedGroupMessages[currentGroupId] = groupMessages;
                appendMessageToChat(msg);
                messageInput.value = '';
                messageInput.style.height = 'auto';
                var sb = document.getElementById('send-btn'); if (sb) sb.classList.add('hidden');
                hideQuoteBar();
                triggerUnifiedReply();
            }

            async function sendVoiceMessage(src, duration) {
                if (currentChatType === 'group') {
                    const msg = { type: 'voice', text: '', src, senderId: 'me', timestamp: new Date().toISOString(), read: true,
                        groupId: currentGroupId, quote: null, duration };
                    const id = await addData('groupMessages', msg);
                    msg.id = id;
                    groupMessages.push(msg);
                    messages = groupMessages;
                    if (currentGroupId) cachedGroupMessages[currentGroupId] = groupMessages;
                    appendMessageToChat(msg);
                    triggerUnifiedReply();
                } else {
                    const contact = getCurrentContact();
                    if (!contact) return;
                    const msg = { type: 'voice', text: '', src, isMe: true, timestamp: new Date().toISOString(), read: false,
                        contactId: currentContactId, quote: null, duration };
                    const id = await addData('messages', msg);
                    msg.id = id;
                    messages.push(msg);
                    appendMessageToChat(msg);
                    scheduleMyRead(msg.id);
                    triggerUnifiedReply();
                }
            }

            function scheduleMyRead(id) {
                setTimeout(async () => {
                    const storeName = currentChatType === 'group' ? 'groupMessages' : 'messages';
                    const msgs = currentChatType === 'group' ? groupMessages : messages;
                    const m = msgs.find(x => x.id === id);
                    if (m && !m.read) { m.read = true;
                        await updateData(storeName, m);
                        updateMessageReadStatus(m.id, true, m.isMe || m.senderId === 'me'); }
                }, 2000 + Math.random() * 6000);
            }

            function schedulePartnerRead() {
                if (currentChatType === 'group') return;
                const unread = messages.filter(m => !m.isMe && !m.read);
                if (!unread.length) return;
                setTimeout(async () => { for (const m of unread) { if (messages.some(x => x.id === m.id)) { m.read =
                                true;
                            await updateData('messages', m);
                            updateMessageReadStatus(m.id, true, m.isMe); } } }, 800 + Math.random() * 1200);
            }

            async function sendPat(text) {
                if (currentChatType === 'group') {
                    await sendGroupMessage(text, 'pat');
                    document.getElementById('emoji-drawer').classList.remove('show');
                    document.body.classList.remove('emoji-open');
                    return;
                }
                const contact = getCurrentContact(); if (!contact) return;
                const now = Date.now();
                if (now - patLastTime < (settings.patCooldown || 5) * 1000) { showToast('操作太频繁啦'); return; }
                patLastTime = now;
                const msg = { type: 'pat', text, isMe: true, timestamp: new Date().toISOString(), read: true,
                    contactId: currentContactId };
                const id = await addData('messages', msg);
                msg.id = id;
                messages.push(msg);
                appendMessageToChat(msg);
                document.getElementById('emoji-drawer').classList.remove('show');
                document.body.classList.remove('emoji-open');
                triggerUnifiedReply();
            }

            function renderPatDrawer() {
                const preset = document.getElementById('pat-preset-list');
                if (!preset) return;
                preset.innerHTML = '';
                var pContact = getCurrentContact();
                var pLib = pContact ? getContactReplySetting(pContact, 'patLibrary') : (settings.patLibrary || []);
                if (pLib.length) {
                    pLib.forEach(p => {
                        const btn = document.createElement('button');
                        btn.className = 'text-sm bg-[var(--card-bg)] rounded-lg py-2 px-3 text-left';
                        btn.textContent = p;
                        btn.onclick = () => sendPat(p);
                        preset.appendChild(btn);
                    });
                }
            }

            async function scheduleUnifiedReply(options) {
                const { contactId, groupId, chatType } = options || {};
                clearReplyQueue();
                var replyContact = chatType === 'private' ? (contacts.find(function(c) { return c.id === contactId; }) || null) : null;
                var rc = function(key) { return getContactReplySetting(replyContact, key); };

                // ===== 已读不回逻辑 =====
                if (rc('readReceiptEnabled') && Math.random() < rc('readReceiptChance')) {
                    const readDelay = 2000 + Math.random() * 5000;
                    setTimeout(() => {
                        markMessagesAsRead(chatType, contactId, groupId);
                        removeTyping();
                    }, readDelay);
                    return;
                }

                const wordCardPool = buildWordCardPool(contactId);
                const emojiKaomojiPool = [...getAllEmojiChars(), ...getAllKaomoji()];
                const stickerPool = buildStickerPool(contactId);
                const voicePool = chatType === 'group' ? [] : buildVoicePool(contactId);
                if (!wordCardPool.length && !emojiKaomojiPool.length && !stickerPool.length && !voicePool.length) {
                    showToast('当前无可回复内容，请先添加字卡或表情');
                    return;
                }

                // ===== 使用用户设置的最大字卡条数，随机生成回复条数 =====
                const maxCards = rc('maxCardsPerReplyUser') || 4;
                const minCards = 1;
                const replyCount = Math.floor(Math.random() * (maxCards - minCards + 1)) + minCards;

                showTyping();
                let allSent = false;
                const checkAllSent = () => { if (allSent) removeTyping(); };
                let accumulatedDelay = 0;
                const minDelay = rc('minReplyTime') * 1000;
                const maxDelay = Math.max(rc('maxReplyTime') * 1000, minDelay);

                // ===== 消息计划数组，每个计划可以包含多个消息（主消息 + 附件） =====
                const messagePlan = [];

                for (let i = 0; i < replyCount; i++) {
                    let mainText = null;
                    if (wordCardPool.length > 0) {
                        if (rc('combineCardsEnabled') && Math.random() < (rc('combineCardsChance') || 0.3) && wordCardPool.length >= 2) {
                            const min = rc('combineCardsMin') || 2;
                            const max = Math.min(rc('combineCardsMax') || 4, wordCardPool.length);
                            const count = Math.max(min, Math.floor(Math.random() * (max - min + 1)) + min);
                            const cards = [];
                            for (let j = 0; j < count; j++) {
                                cards.push(wordCardPool[Math.floor(Math.random() * wordCardPool.length)]);
                            }
                            mainText = cards.join(Math.random() < 0.95 ? '，' : '');
                        } else {
                            mainText = wordCardPool[Math.floor(Math.random() * wordCardPool.length)];
                        }
                        if (emojiKaomojiPool.length > 0 && Math.random() < 0.2) {
                            const extra = emojiKaomojiPool[Math.floor(Math.random() * emojiKaomojiPool.length)];
                            mainText = Math.random() < 0.5 ? extra + ' ' + mainText : mainText + ' ' + extra;
                        }
                    } else if (emojiKaomojiPool.length > 0) {
                        mainText = emojiKaomojiPool[Math.floor(Math.random() * emojiKaomojiPool.length)];
                        if (mainText && Math.random() < 0.2) {
                            const extra = emojiKaomojiPool[Math.floor(Math.random() * emojiKaomojiPool.length)];
                            mainText = Math.random() < 0.5 ? extra + ' ' + mainText : mainText + ' ' + extra;
                        }
                    }

                    const plan = { messages: [] };

                    if (mainText) {
                        let quote = null;
                        if (rc('quoteEnabled') && Math.random() < (rc('quoteChance') || 0.3)) {
                            const currentMsgs = (chatType === 'group' ? groupMessages : messages);
                            const recentMsgs = currentMsgs.filter(m => m.type !== 'pat' && m.type !== 'call').slice(-10);
                            if (recentMsgs.length > 0) {
                                const refMsg = recentMsgs[Math.floor(Math.random() * recentMsgs.length)];
                                if (chatType === 'group') {
                                    const refAuthor = refMsg.senderId === 'me' ? settings.myName : (contacts.find(c => c.id ===
                                        refMsg.senderId)?.name || '未知');
                                    quote = { senderId: refMsg.senderId, type: refMsg.type, text: refMsg.type === 'text' ? refMsg
                                            .text : (refMsg.type === 'image' ? '[图片]' : (refMsg.type === 'voice' ? '[语音]' :
                                            '[消息]')), author: refAuthor };
                                } else {
                                    quote = { author: refMsg.isMe ? settings.myName : (getCurrentContact()?.name || 'TA'),
                                        text: refMsg.type === 'text' ? refMsg.text : (refMsg.type === 'image' ? '[图片]' : (refMsg
                                            .type === 'voice' ? '[语音]' : '[消息]')) };
                                }
                            }
                        }
                        plan.messages.push({ type: 'text', text: mainText, quote: quote });

                        // ===== 字卡附带图片（直接跟随，不累加延迟） =====
                        if (stickerPool.length > 0 && Math.random() < 0.2) {
                            const sticker = stickerPool[Math.floor(Math.random() * stickerPool.length)];
                            plan.messages.push({ type: 'image', src: sticker.src });
                        }
                    }

                    if (stickerPool.length > 0 && Math.random() < 0.15 && !mainText) {
                        const sticker = stickerPool[Math.floor(Math.random() * stickerPool.length)];
                        plan.messages.push({ type: 'image', src: sticker.src });
                    }

                    const voiceChance = rc('voiceReplyChance') || 0.06;
                    if (voicePool.length > 0 && Math.random() < voiceChance && chatType !== 'group') {
                        const voice = voicePool[Math.floor(Math.random() * voicePool.length)];
                        plan.messages.push({ type: 'voice', src: voice.src, duration: voice.duration || 3 });
                    }

                    const patPool = getPartnerPatPool(replyContact);
                    if (rc('replyPatChance') > 0 && Math.random() < rc('replyPatChance') && patPool.length) {
                        const patText = patPool[Math.floor(Math.random() * patPool.length)];
                        plan.messages.push({ type: 'pat', text: patText });
                    }

                    if (rc('replyCallChance') > 0 && Math.random() < rc('replyCallChance')) {
                        if (chatType === 'group') {
                            const initiatorId = getRandomGroupMember(groupId);
                            if (initiatorId) { plan.messages.push({ type: 'groupCall', initiatorId, groupId }); }
                        } else { plan.messages.push({ type: 'privateCall', contactId }); }
                    }

                    if (plan.messages.length > 0) {
                        messagePlan.push(plan);
                    }
                }

                if (chatType === 'group' && voicePool.length === 0) {
                    const groupMembers = (getCurrentGroup()?.members || []).filter(mid => mid !== 'me');
                    const membersWithVoice = groupMembers.filter(mid => buildVoicePool(mid).length > 0);
                    const gVoiceChance = rc('voiceReplyChance') || 0.06;
                    if (membersWithVoice.length > 0 && Math.random() < gVoiceChance) {
                        const randomMemberId = membersWithVoice[Math.floor(Math.random() * membersWithVoice.length)];
                        const memberVoicePool = buildVoicePool(randomMemberId);
                        if (memberVoicePool.length > 0) {
                            const voice = memberVoicePool[Math.floor(Math.random() * memberVoicePool.length)];
                            const member = contacts.find(c => c.id === randomMemberId);
                            const plan = { messages: [{ type: 'voice', src: voice.src, duration: voice.duration || 3,
                                    senderId: randomMemberId, senderName: member?.name || '未知' }] };
                            messagePlan.push(plan);
                        }
                    }
                }

                if (rc('separateEmojiEnabled') && emojiKaomojiPool.length > 0 && Math.random() < 0.2) {
                    const single = emojiKaomojiPool[Math.floor(Math.random() * emojiKaomojiPool.length)];
                    messagePlan.push({ messages: [{ type: 'text', text: single }] });
                }

                let plansToSend = messagePlan.length;
                if (plansToSend === 0) { allSent = true;
                    checkAllSent();
                    markMessagesAsRead(chatType, contactId, groupId); return; }

                for (let index = 0; index < messagePlan.length; index++) {
                    const plan = messagePlan[index];
                    const currentDelay = minDelay + Math.random() * (maxDelay - minDelay);
                    accumulatedDelay += currentDelay;
                    const timerId = setTimeout(async () => {
                        const isStillValid = chatType === 'group'
                            ? currentChatType === 'group' && currentGroupId === groupId
                            : currentChatType === 'private' && currentContactId === contactId;
                        if (!isStillValid) {
                            plansToSend--;
                            if (plansToSend <= 0) { allSent = true;
                                checkAllSent(); }
                            return;
                        }
                        // ===== 按顺序发送计划中的所有消息（共享同一个延迟） =====
                        for (const msg of plan.messages) {
                            if (msg.type === 'privateCall') {
                                incomingCallFromContact(msg.contactId);
                            } else if (msg.type === 'groupCall') {
                                incomingGroupCallFromMember(msg.groupId, msg.initiatorId);
                            } else if (msg.type === 'voice' && msg.senderId && chatType === 'group') {
                                await sendGroupVoiceFromMember(msg, groupId);
                            } else {
                                await sendPlannedMessage(chatType, contactId, groupId, msg, index === messagePlan
                                    .length - 1 && msg === plan.messages[plan.messages.length - 1]);
                            }
                        }
                        plansToSend--;
                        if (plansToSend <= 0) { allSent = true;
                            checkAllSent();
                            markMessagesAsRead(chatType, contactId, groupId); }
                    }, accumulatedDelay);
                    replyQueue.push({ timerId, context: { contactId, groupId } });
                }
            }

            async function sendGroupVoiceFromMember(plan, groupId) {
                const memberName = plan.senderName || (contacts.find(c => c.id === plan.senderId)?.name || '未知');
                showGroupTypingBar(`${memberName} 正在说话...`);
                const prepDelay = 800 + Math.random() * 1500;
                setTimeout(async () => {
                    hideGroupTypingBar();
                    const msg = { type: 'voice', text: '', src: plan.src, senderId: plan.senderId, timestamp: new Date()
                            .toISOString(), read: false, groupId, quote: null, duration: plan.duration || 3 };
                    const id = await addData('groupMessages', msg);
                    msg.id = id;
                    groupMessages.push(msg);
                    messages = groupMessages;
                    appendMessageToChat(msg);
                    scrollToBottom();
                }, prepDelay);
            }

            function showGroupTypingBar(text) {
                const bar = document.getElementById('group-typing-bar');
                if (!bar) return;
                bar.textContent = text;
                bar.classList.remove('hidden');
                if (groupTypingBarTimeout) clearTimeout(groupTypingBarTimeout);
                groupTypingBarTimeout = setTimeout(() => hideGroupTypingBar(), 3000);
            }

            function hideGroupTypingBar() {
                const bar = document.getElementById('group-typing-bar');
                if (bar) bar.classList.add('hidden');
                if (groupTypingBarTimeout) clearTimeout(groupTypingBarTimeout);
            }

            function getRandomGroupMember(groupId) {
                const group = groups.find(g => g.id === groupId);
                if (!group || !group.members) return null;
                const available = group.members.filter(mid => mid !== 'me');
                if (!available.length) return null;
                return available[Math.floor(Math.random() * available.length)];
            }

            async function sendPlannedMessage(chatType, contactId, groupId, plan, isLast) {
                const msg = { type: plan.type, text: plan.text || '', src: plan.src || null, timestamp: new Date().toISOString(),
                    read: false, duration: plan.duration || 0 };
                if (chatType === 'group') {
                    msg.senderId = plan.senderId || getRandomGroupMember(groupId);
                    if (!msg.senderId) return;
                    msg.groupId = groupId;
                    if (plan.quote && msg.type !== 'pat' && msg.type !== 'voice') { msg.quote = { senderId: plan.quote
                                .senderId, type: plan.quote.type, text: plan.quote.text }; }
                    const id = await addData('groupMessages', msg);
                    msg.id = id;
                    groupMessages.push(msg);
                    messages = groupMessages;
                } else {
                    msg.isMe = false;
                    msg.contactId = contactId;
                    if (plan.quote && msg.type !== 'pat' && msg.type !== 'voice') { msg.quote = plan.quote; }
                    const id = await addData('messages', msg);
                    msg.id = id;
                    messages.push(msg);
                }
                appendMessageToChat(msg);
                scrollToBottom();
                if (chatType === 'private' && !msg.isMe && msg.type !== 'pat' && msg.type !== 'call') {
                    var c = contacts.find(function(ct) { return ct.id === contactId; });
                    if (c) {
                        var preview = msg.type === 'text' ? msg.text : (msg.type === 'image' ? '[图片]' : '[消息]');
                        showNotification(c.name, preview, c.avatar, c.id);
                    }
                }
                renderContactList();
            }

            async function markMessagesAsRead(chatType, contactId, groupId) {
                if (chatType === 'group') {
                    const unread = groupMessages.filter(m => m.senderId !== 'me' && !m.read);
                    for (const m of unread) { m.read = true;
                        await updateData('groupMessages', m); }
                } else {
                    const unread = messages.filter(m => !m.isMe && !m.read);
                    for (const m of unread) { m.read = true;
                        await updateData('messages', m); }
                }
                renderMessages();
            }

            function triggerUnifiedReply() {
                clearReplyQueue();
                scheduleUnifiedReply({ contactId: currentContactId, groupId: currentGroupId, chatType: currentChatType });
            }

            function renderEmojiDrawer() {
                renderEmojiTabs();
                const lib = document.getElementById('emoji-lib-content');
                if (!lib) return;
                lib.innerHTML = '';
                var packs = settings.emojiPacks || [];
                var hasPacks = packs.length > 0;
                if (hasPacks) {
                    packs.forEach(function(pack, pi) {
                        if (!pack.emojis || !pack.emojis.length) return;
                        var header = document.createElement('div');
                        header.className = 'col-span-8 text-xs font-medium text-[var(--text-secondary)] py-1 px-1 mt-1';
                        header.textContent = pack.name || ('分组' + (pi + 1));
                        lib.appendChild(header);
                        pack.emojis.forEach(function(ch) {
                            var s = document.createElement('span');
                            s.className = 'text-xl cursor-pointer p-1 text-center rounded hover:bg-[var(--theme-light)]';
                            s.textContent = ch;
                            s.onclick = function() { sendEmojiMsg(ch); };
                            s.oncontextmenu = function(e) { e.preventDefault(); var idx = pack.emojis.indexOf(ch); if (idx !== -1 && confirm('从"' + pack.name + '"中删除？')) { pack.emojis.splice(idx, 1); saveSettings(); renderEmojiDrawer(); } };
                            lib.appendChild(s);
                        });
                    });
                } else {
                    getAllEmojiChars().forEach(function(ch, idx) {
                        var s = document.createElement('span');
                        s.className = 'text-xl cursor-pointer p-1 text-center rounded hover:bg-[var(--theme-light)]';
                        s.textContent = ch;
                        s.onclick = function() { sendEmojiMsg(ch); };
                        s.oncontextmenu = function(e) { e.preventDefault(); if (confirm('删除？')) { emojiChars.splice(idx, 1); saveSettings(); renderEmojiDrawer(); } };
                        lib.appendChild(s);
                    });
                }
                renderEmojiPacksList();
                const kao = document.getElementById('kaomoji-content');
                if (kao) {
                    const batchDiv = kao.querySelector('.col-span-3');
                    kao.innerHTML = '';
                    if (batchDiv) kao.appendChild(batchDiv);
                    getAllKaomoji().forEach((k, idx) => {
                        const s = document.createElement('span');
                        s.className = 'text-xs cursor-pointer p-1.5 text-center rounded hover:bg-[var(--theme-light)] truncate';
                        s.style.minHeight = '2.4rem';
                        s.style.display = 'flex';
                        s.style.alignItems = 'center';
                        s.style.justifyContent = 'center';
                        s.textContent = k;
                        s.onclick = () => sendKaomojiMsg(k);
                        s.oncontextmenu = e => { e.preventDefault(); if (confirm('删除？')) { kaomojiChars.splice(idx, 1);
                                saveSettings();
                                renderEmojiDrawer(); } };
                        kao.appendChild(s);
                    });
                }
                const mine = document.getElementById('mine-emojis-content');
                mine.innerHTML = '';
                emojis.filter(e => e.category === 'mine').forEach(e => {
                    const d = document.createElement('div');
                    d.className = 'cursor-pointer rounded p-1';
                    d.innerHTML = `<img src="${e.src}" class="w-12 h-12 object-contain rounded">`;
                    d.onclick = () => sendStickerMsg(e.src, 'mine');
                    d.oncontextmenu = ev => { ev.preventDefault(); if (confirm('删除？')) { emojis = emojis.filter(x => x
                                .id !== e.id);
                            deleteData('emojis', e.id);
                            renderEmojiDrawer(); } };
                    mine.appendChild(d);
                });
                const shared = document.getElementById('shared-emojis-content');
                shared.innerHTML = '';
                var _batch = window._sharedEmojiBatch || false;
                var toolbar = document.createElement('div');
                toolbar.className = 'flex items-center justify-between mb-2 px-1';
                var batchToggle = document.createElement('button');
                batchToggle.className = 'text-xs px-2 py-1 rounded ' + (_batch ? 'text-white' : 'text-[var(--text-secondary)] border');
                batchToggle.style.background = _batch ? 'var(--theme)' : 'transparent';
                batchToggle.textContent = _batch ? '退出选择' : '选择';
                batchToggle.onclick = function() { window._sharedEmojiBatch = !_batch; window._selectedEmojis = []; renderEmojiDrawer(); };
                toolbar.appendChild(batchToggle);
                if (_batch) {
                    var batchActions = document.createElement('div');
                    batchActions.className = 'flex gap-2';
                    var moveBtn = document.createElement('button');
                    moveBtn.textContent = '移动分组';
                    moveBtn.className = 'text-xs px-2 py-1 bg-blue-500 text-white rounded';
                    moveBtn.onclick = function() { batchMoveSharedEmojis(); };
                    batchActions.appendChild(moveBtn);
                    var delSelectedBtn = document.createElement('button');
                    delSelectedBtn.textContent = '删除选中';
                    delSelectedBtn.className = 'text-xs px-2 py-1 bg-red-500 text-white rounded';
                    delSelectedBtn.onclick = function() { batchDeleteSharedEmojis(); };
                    batchActions.appendChild(delSelectedBtn);
                    toolbar.appendChild(batchActions);
                }
                shared.appendChild(toolbar);
                if (!window._selectedEmojis) window._selectedEmojis = [];
                var groups = settings.sharedEmojiGroups || [{ id: 'default', name: '默认', enabled: true }];
                var sharedEmojis = emojis.filter(e => e.category === 'shared');
                groups.forEach(function(grp) {
                    if (!grp.enabled) return;
                    var groupEmojis = sharedEmojis.filter(function(e) { return (e.group || 'default') === grp.id; });
                    if (!groupEmojis.length) return;
                    var section = document.createElement('div');
                    section.className = 'mb-2';
                    var header = document.createElement('div');
                    header.className = 'text-xs font-medium text-[var(--text-secondary)] mb-1 px-1';
                    header.textContent = grp.name + ' (' + groupEmojis.length + ')';
                    section.appendChild(header);
                    var grid = document.createElement('div');
                    grid.className = 'grid grid-cols-8 gap-1';
                    groupEmojis.forEach(function(e) {
                        var d = document.createElement('div');
                        d.className = 'rounded p-1 relative group';
                        if (_batch) {
                            d.className += ' border-2 ' + (window._selectedEmojis.indexOf(e.id) !== -1 ? 'border-[var(--theme)]' : 'border-transparent');
                            d.innerHTML = '<img src="' + e.src + '" class="w-12 h-12 object-contain rounded">';
                            var cb = document.createElement('div');
                            cb.className = 'absolute top-0 left-0 w-4 h-4 text-xs flex items-center justify-center rounded-sm ' + (window._selectedEmojis.indexOf(e.id) !== -1 ? 'bg-[var(--theme)] text-white' : 'bg-black/30 text-white');
                            cb.textContent = window._selectedEmojis.indexOf(e.id) !== -1 ? '✓' : '';
                            d.appendChild(cb);
                            d.style.cursor = 'pointer';
                            d.onclick = function() { var idx = window._selectedEmojis.indexOf(e.id); if (idx !== -1) { window._selectedEmojis.splice(idx, 1); } else { window._selectedEmojis.push(e.id); } renderEmojiDrawer(); };
                        } else {
                            d.className += ' cursor-pointer';
                            d.innerHTML = '<img src="' + e.src + '" class="w-12 h-12 object-contain rounded">';
                            var deleteOverlay = document.createElement('div');
                            deleteOverlay.className = 'absolute top-0 right-0 bg-black/50 text-white text-xs rounded-bl px-1 cursor-pointer hidden group-hover:block';
                            deleteOverlay.textContent = '✕';
                            deleteOverlay.onclick = function(ev) { ev.stopPropagation(); if (confirm('删除？')) { emojis = emojis.filter(function(x) { return x.id !== e.id; }); deleteData('emojis', e.id); renderEmojiDrawer(); } };
                            d.appendChild(deleteOverlay);
                            d.onclick = function() { sendStickerMsg(e.src, 'shared'); };
                        }
                        grid.appendChild(d);
                    });
                    section.appendChild(grid);
                    shared.appendChild(section);
                });
                if (!sharedEmojis.length) {
                    shared.innerHTML += '<div class="text-center text-[var(--text-secondary)] py-8 text-xs">暂无共用表情</div>';
                }
                window._emojiLibSnapshot = document.getElementById('emoji-lib-content')?.innerHTML || '';
                switchEmojiTab(window._currentEmojiTab || 'emoji-lib');
            }

            function renderEmojiPacksList() {
                var container = document.getElementById('pack-list');
                if (!container) return;
                container.innerHTML = '';
                var packs = settings.emojiPacks || [];
                packs.forEach(function(pack, pi) {
                    var row = document.createElement('div');
                    row.className = 'flex items-center justify-between py-1 px-2 bg-[var(--theme-light)] rounded';
                    var nameSpan = document.createElement('span');
                    nameSpan.className = 'text-xs font-medium';
                    nameSpan.textContent = (pack.name || '未命名') + ' (' + (pack.emojis ? pack.emojis.length : 0) + ')';
                    row.appendChild(nameSpan);
                    var btnGroup = document.createElement('div');
                    btnGroup.className = 'flex space-x-1';
                    var delBtn = document.createElement('button');
                    delBtn.className = 'text-red-400 text-xs';
                    delBtn.textContent = '✕';
                    delBtn.onclick = function() {
                        if (confirm('删除分组"' + (pack.name || '未命名') + '"？')) {
                            settings.emojiPacks.splice(pi, 1);
                            saveSettings();
                            renderEmojiPacksList();
                            renderEmojiDrawer();
                        }
                    };
                    btnGroup.appendChild(delBtn);
                    row.appendChild(btnGroup);
                    container.appendChild(row);
                });
                if (!packs.length) {
                    container.innerHTML = '<div class="text-xs text-[var(--text-secondary)]">暂无分组</div>';
                }
            }

            function renderSharedGroupList() {
                var container = document.getElementById('shared-group-list');
                if (!container) return;
                container.innerHTML = '';
                var groups = settings.sharedEmojiGroups || [{ id: 'default', name: '默认', enabled: true }];
                var sharedEmojis = emojis.filter(function(e) { return e.category === 'shared'; });
                function getGroupEmojiCount(gid) { return sharedEmojis.filter(function(e) { return (e.group || 'default') === gid; }).length; }
                groups.forEach(function(grp, gi) {
                    var row = document.createElement('div');
                    row.className = 'flex items-center justify-between py-1 px-2 bg-[var(--theme-light)] rounded';
                    var left = document.createElement('div');
                    left.className = 'flex items-center gap-2';
                    var toggle = document.createElement('button');
                    toggle.textContent = grp.enabled ? '👁️' : '🚫';
                    toggle.className = 'text-xs';
                    toggle.title = grp.enabled ? '已启用' : '已隐藏';
                    toggle.onclick = function() { grp.enabled = !grp.enabled; if (!settings.sharedEmojiGroups.some(function(g) { return g.enabled; })) { grp.enabled = true; showToast('至少保留一个启用分组'); } saveSettings(); renderSharedGroupList(); renderEmojiDrawer(); };
                    left.appendChild(toggle);
                    var nameSpan = document.createElement('span');
                    nameSpan.className = 'text-xs';
                    nameSpan.textContent = grp.name + ' (' + getGroupEmojiCount(grp.id) + ')';
                    left.appendChild(nameSpan);
                    row.appendChild(left);
                    var btnGroup = document.createElement('div');
                    btnGroup.className = 'flex space-x-1';
                    if (gi > 0) {
                        var upBtn = document.createElement('button');
                        upBtn.textContent = '⬆';
                        upBtn.className = 'text-xs text-[var(--text-secondary)]';
                        upBtn.onclick = function() { var arr = settings.sharedEmojiGroups; var t = arr[gi]; arr[gi] = arr[gi - 1]; arr[gi - 1] = t; saveSettings(); renderSharedGroupList(); renderEmojiDrawer(); };
                        btnGroup.appendChild(upBtn);
                    }
                    var renameBtn = document.createElement('button');
                    renameBtn.textContent = '✏️';
                    renameBtn.className = 'text-xs';
                    renameBtn.title = '重命名';
                    renameBtn.onclick = function() { var n = prompt('新名称', grp.name); if (n && n.trim()) { grp.name = n.trim(); saveSettings(); renderSharedGroupList(); renderEmojiDrawer(); } };
                    btnGroup.appendChild(renameBtn);
                    var delBtn = document.createElement('button');
                    delBtn.textContent = '✕';
                    delBtn.className = 'text-red-400 text-xs';
                    delBtn.onclick = function() { if (confirm('删除分组"' + grp.name + '"？（组内表情将被移到默认分组）')) { var gid = grp.id; settings.sharedEmojiGroups.splice(gi, 1); sharedEmojis.forEach(function(e) { if ((e.group || 'default') === gid) { e.group = 'default'; updateData('emojis', e); } }); saveSettings(); renderSharedGroupList(); renderEmojiDrawer(); } };
                    btnGroup.appendChild(delBtn);
                    row.appendChild(btnGroup);
                    container.appendChild(row);
                });
                if (!groups.length) {
                    container.innerHTML = '<div class="text-xs text-[var(--text-secondary)]">暂无分组</div>';
                }
                var select = document.getElementById('upload-emoji-group');
                if (select) {
                    select.innerHTML = '';
                    groups.forEach(function(grp) {
                        var opt = document.createElement('option');
                        opt.value = grp.id;
                        opt.textContent = grp.name;
                        select.appendChild(opt);
                    });
                }
            }

            function getSelectedEmojis() {
                var sel = window._selectedEmojis || [];
                return emojis.filter(function(e) { return e.category === 'shared' && sel.indexOf(e.id) !== -1; });
            }
            function batchDeleteSharedEmojis() {
                var sel = getSelectedEmojis();
                if (!sel.length) { showToast('请先选择表情'); return; }
                if (!confirm('删除选中的 ' + sel.length + ' 个表情？')) return;
                sel.forEach(function(e) { emojis = emojis.filter(function(x) { return x.id !== e.id; }); deleteData('emojis', e.id); });
                window._selectedEmojis = [];
                showToast('已删除 ' + sel.length + ' 个表情');
                renderEmojiDrawer();
            }
            function batchMoveSharedEmojis() {
                var sel = getSelectedEmojis();
                if (!sel.length) { showToast('请先选择表情'); return; }
                var groups = settings.sharedEmojiGroups || [];
                if (groups.length < 2) { showToast('没有其他分组可以移动'); return; }
                var groupNames = groups.map(function(g) { return g.name; });
                var targetName = prompt('移动到分组（可选：' + groupNames.join(', ') + '）\n输入分组名：');
                if (!targetName) return;
                var target = groups.filter(function(g) { return g.name === targetName.trim(); })[0];
                if (!target) { showToast('分组不存在'); return; }
                sel.forEach(function(e) { e.group = target.id; updateData('emojis', e); });
                window._selectedEmojis = [];
                window._sharedEmojiBatch = false;
                showToast('已移动 ' + sel.length + ' 个表情');
                renderEmojiDrawer();
            }

            async function sendEmojiMsg(ch) {
                if (currentChatType === 'group') { await sendGroupMessage(ch);
                    document.getElementById('emoji-drawer').classList.remove('show'); return; }
                const c = getCurrentContact(); if (!c) return;
                const msg = { type: 'text', text: ch, isMe: true, timestamp: new Date().toISOString(), read: false,
                    contactId: currentContactId };
                const id = await addData('messages', msg);
                msg.id = id;
                messages.push(msg);
                appendMessageToChat(msg);
                document.getElementById('emoji-drawer').classList.remove('show');
                scheduleMyRead(msg.id);
                triggerUnifiedReply();
            }

            async function sendKaomojiMsg(k) {
                if (currentChatType === 'group') { await sendGroupMessage(k);
                    document.getElementById('emoji-drawer').classList.remove('show'); return; }
                const c = getCurrentContact(); if (!c) return;
                const msg = { type: 'text', text: k, isMe: true, timestamp: new Date().toISOString(), read: false,
                    contactId: currentContactId };
                const id = await addData('messages', msg);
                msg.id = id;
                messages.push(msg);
                appendMessageToChat(msg);
                document.getElementById('emoji-drawer').classList.remove('show');
                scheduleMyRead(msg.id);
                triggerUnifiedReply();
            }

            async function sendStickerMsg(src, category) {
                if (currentChatType === 'group') { await sendGroupMessage('[图片]', 'image', src);
                    document.getElementById('emoji-drawer').classList.remove('show'); return; }
                const c = getCurrentContact(); if (!c) return;
                const msg = { type: 'image', src, isMe: true, timestamp: new Date().toISOString(), read: false,
                    contactId: currentContactId };
                const id = await addData('messages', msg);
                msg.id = id;
                messages.push(msg);
                appendMessageToChat(msg);
                document.getElementById('emoji-drawer').classList.remove('show');
                scheduleMyRead(msg.id);
                triggerUnifiedReply();
            }

            function renderEmojiTabs() {
                var bar = document.getElementById('emoji-tab-bar');
                if (!bar) return;
                bar.innerHTML = '';
                var tabs = [
                    { id: 'add', label: '➕', title: '添加管理' },
                    { id: 'emoji-lib', label: '😊', title: 'Emoji' },
                    { id: 'kaomoji', label: '✧', title: '颜文字' },
                    { id: 'mine', label: '😺', title: '我的表情' },
                    { id: 'shared', label: '📦', title: '共用表情' },
                    { id: 'pat', label: '👋', title: '拍一拍' }
                ];
                var packs = settings.emojiPacks || [];
                packs.forEach(function(pack, pi) {
                    tabs.push({ id: 'pack-' + pi, label: pack.icon || '📁', title: pack.name || '分组' + (pi + 1), packIdx: pi });
                });
                if (currentChatType === 'private') {
                    var contact = getCurrentContact();
                    if (contact && contact.uniqueEmojis && contact.uniqueEmojis.length) {
                        tabs.push({ id: 'contact-emojis', label: '💝', title: contact.name + '的专属' });
                    }
                }
                tabs.forEach(function(tab, idx) {
                    var btn = document.createElement('button');
                    btn.className = 'emoji-tab flex-shrink-0 px-2 py-2 text-sm border-b-2 transition-colors';
                    btn.dataset.tab = tab.id;
                    btn.textContent = tab.label;
                    btn.title = tab.title;
                    if (tab.id === window._currentEmojiTab || (!window._currentEmojiTab && idx === 1)) {
                        btn.style.borderColor = 'var(--theme)';
                        btn.style.color = 'var(--theme)';
                    } else {
                        btn.style.borderColor = 'transparent';
                        btn.style.color = 'var(--text-secondary)';
                    }
                    btn.onclick = function() { switchEmojiTab(tab.id); };
                    bar.appendChild(btn);
                });
            }
            window._currentEmojiTab = 'emoji-lib';
            window._emojiLibSnapshot = null;
            function switchEmojiTab(name) {
                window._currentEmojiTab = name;
                document.querySelectorAll('#emoji-tab-bar .emoji-tab').forEach(function(t) {
                    t.style.color = t.dataset.tab === name ? 'var(--theme)' : 'var(--text-secondary)';
                    t.style.borderColor = t.dataset.tab === name ? 'var(--theme)' : 'transparent';
                });
                var staticContent = ['emoji-lib-content', 'kaomoji-content', 'mine-emojis-content', 'shared-emojis-content', 'pat-content', 'add-emoji-content'];
                var allContent = staticContent.concat([]);
                staticContent.forEach(function(id) { var el = document.getElementById(id); if (el) el.classList.add('hidden'); });
                var extraContents = document.querySelectorAll('.emoji-extra-content');
                extraContents.forEach(function(el) { el.classList.add('hidden'); });
                var map = { 'emoji-lib': 'emoji-lib-content', 'kaomoji': 'kaomoji-content', 'mine': 'mine-emojis-content',
                    'shared': 'shared-emojis-content', 'pat': 'pat-content', 'add': 'add-emoji-content' };
                var isPack = name && name.startsWith('pack-');
                var isContactEmoji = name === 'contact-emojis';
                if (name === 'emoji-lib' && window._emojiLibSnapshot) {
                    var libEl = document.getElementById('emoji-lib-content');
                    if (libEl) { libEl.innerHTML = window._emojiLibSnapshot; libEl.classList.remove('hidden'); }
                } else if (map[name]) {
                    var el = document.getElementById(map[name]);
                    if (el) el.classList.remove('hidden');
                } else if (isPack) {
                    var pi = parseInt(name.replace('pack-', ''));
                    renderEmojiPackContent(pi);
                } else if (isContactEmoji) {
                    renderContactEmojiContent();
                } else {
                    var el = document.getElementById('emoji-lib-content');
                    if (el) el.classList.remove('hidden');
                }
                if (name === 'pat' && window.LOVE && LOVE.renderPatDrawer) LOVE.renderPatDrawer();
                if (name === 'add') { renderEmojiPacksList(); renderSharedGroupList(); }
            }
            function renderEmojiPackContent(packIdx) {
                var lib = document.getElementById('emoji-lib-content');
                if (!lib) return;
                lib.classList.remove('hidden');
                lib.innerHTML = '';
                var packs = settings.emojiPacks || [];
                var pack = packs[packIdx];
                if (!pack || !pack.emojis || !pack.emojis.length) {
                    lib.innerHTML = '<div class="col-span-8 text-center text-[var(--text-secondary)] py-4 text-xs">分组为空</div>';
                    return;
                }
                pack.emojis.forEach(function(ch, idx) {
                    var s = document.createElement('span');
                    s.className = 'text-xl cursor-pointer p-1 text-center rounded hover:bg-[var(--theme-light)]';
                    s.textContent = ch;
                    s.onclick = function() { sendEmojiMsg(ch); };
                    s.oncontextmenu = function(e) { e.preventDefault(); if (confirm('从"' + (pack.name || '分组') + '"中删除？')) { pack.emojis.splice(idx, 1); saveSettings(); renderEmojiDrawer(); } };
                    lib.appendChild(s);
                });
            }
            function renderContactEmojiContent() {
                var lib = document.getElementById('emoji-lib-content');
                if (!lib) return;
                lib.classList.remove('hidden');
                lib.innerHTML = '';
                var contact = getCurrentContact();
                if (!contact || !contact.uniqueEmojis || !contact.uniqueEmojis.length) {
                    lib.innerHTML = '<div class="col-span-8 text-center text-[var(--text-secondary)] py-4 text-xs">暂无专属表情</div>';
                    return;
                }
                contact.uniqueEmojis.forEach(function(e) {
                    var d = document.createElement('div');
                    d.className = 'cursor-pointer rounded p-1';
                    d.innerHTML = '<img src="' + e.src + '" class="w-12 h-12 object-contain rounded">';
                    d.onclick = function() { sendStickerMsg(e.src, 'shared'); };
                    lib.appendChild(d);
                });
            }

            let currentLetterId = null;

            function renderLetterList() {
                const container = document.getElementById('letter-list-container');
                if (!container) {
                    const myList = document.getElementById('my-letters-list');
                    const pList = document.getElementById('partner-letters-list');
                    if (!myList || !pList) return;
                    myList.innerHTML = '';
                    pList.innerHTML = '';
                    letters.forEach(l => {
                        const card = document.createElement('div');
                        card.className = 'letter-paper text-xs cursor-pointer hover:shadow-md transition-shadow relative';
                        const preview = (l.text || '').substring(0, 30) + (l.text.length > 30 ? '...' : '');
                        const hasReply = l.reply !== null;
                        const replyBadgeHtml = hasReply ? '<span class="letter-reply-badge"><i class="fa fa-envelope-o"></i> 已回信</span>' : '';
                        card.innerHTML =
                            <p class="text-xs text-[var(--text-secondary)] mb-1"> + $ + {formatDateTime(l.timestamp)}</p><p class="mb-1"> + $ + {escapeHtml(preview)}</p> + $ + {replyBadgeHtml}<button class="absolute top-2 right-2 text-red-400 hover:text-red-600" onclick="event.stopPropagation();window.deleteLetter( + $ + {l.id})"><i class="fa fa-trash"></i></button>;
                        card.onclick = () => showLetterDetail(l.id);
                        if (l.isMe) myList.appendChild(card);
                        else pList.appendChild(card);
                    });
                    return;
                }
                container.innerHTML = '';
                const filtered = letters.filter(l => letterTabMode === 'mine' ? l.isMe : !l.isMe);
                if (filtered.length === 0) {
                    container.innerHTML = '<div class="text-center text-[var(--text-secondary)] py-8 text-sm">暂无信件</div>';
                    return;
                }
                filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                filtered.forEach(l => {
                    const card = document.createElement('div');
                    card.className = 'letter-paper text-xs cursor-pointer hover:shadow-md transition-shadow relative';
                    const preview = (l.text || '').substring(0, 40) + (l.text.length > 40 ? '...' : '');
                    const hasReply = l.reply !== null;
                    const replyBadgeHtml = hasReply ? '<span class="letter-reply-badge"><i class="fa fa-envelope-o"></i> 已回信</span>' : '';
                    card.innerHTML =
                        <p class="text-xs text-[var(--text-secondary)] mb-1"> + $ + {formatDateTime(l.timestamp)}</p><p class="mb-1"> + $ + {escapeHtml(preview)}</p> + $ + {replyBadgeHtml}<button class="absolute top-2 right-2 text-red-400 hover:text-red-600" onclick="event.stopPropagation();window.deleteLetter( + $ + {l.id})"><i class="fa fa-trash"></i></button>;
                    card.onclick = () => showLetterDetail(l.id);
                    container.appendChild(card);
                });
            }
            window.deleteLetter(${l.id})"><i class="fa fa-trash"></i></button>`;
                    card.onclick = () => showLetterDetail(l.id);
                    if (l.isMe) myList.appendChild(card);
                    else pList.appendChild(card);
                });
            }
            window.deleteLetter = async function(id) {
                if (!confirm('确定删除这封信吗？')) return;
                await deleteData('letters', id);
                letters = letters.filter(l => l.id !== id);
                renderLetterList();
            };

            function showLetterDetail(letterId) {
                const letter = letters.find(l => l.id === letterId);
                if (!letter) return;
                currentLetterId = letterId;
                const container = document.getElementById('letter-comparison-view');
                const detailContent = document.getElementById('letter-detail-content');
                if (!container && !detailContent) return;
                let html = '';
                html += renderLetterPaper(letter, letter.isMe ? '我' : (getCurrentContact()?.name || 'TA'));
                if (letter.reply !== null) {
                    const replyLetter = letters.find(l => l.id === letter.reply);
                    if (replyLetter) {
                        html += '<div class="letter-separator"><i class="fa fa-feather"></i></div>';
                        html += renderLetterPaper(replyLetter, replyLetter.isMe ? '我' : (getCurrentContact()?.name || 'TA'), true);
                    }
                } else {
                    html += '<div class="text-center mt-6"><button id="reply-from-detail-btn" class="px-6 py-2.5 text-white rounded-xl text-sm" style="background:var(--theme)"><i class="fa fa-reply"></i> 回信</button></div>';
                }
                if (container) { container.innerHTML = html; }
                else { detailContent.innerHTML = html; }
                var replyBtn = document.getElementById('reply-from-detail-btn');
                if (replyBtn) replyBtn.onclick = function() { replyToLetterId = currentLetterId; document.getElementById('letter-detail').classList.remove('open'); openLetterComposeWithReply(currentLetterId); };
                document.getElementById('letter-detail').classList.add('open');
                document.getElementById('letter-inbox').classList.remove('open');
            }
            async function sendMyLetter(text, replyTo = null, isMe = true) {
                const contact = getCurrentContact();
                if (!contact) return;
                var isFromMe = (isMe === undefined || isMe === null) ? true : isMe;
                var now = new Date();
                var timeStr = now.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' + now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                var myName = settings.myName || '我';
                var partnerName = contact.name || 'TA';
                var formattedText = '亲爱的' + (isFromMe ? partnerName : myName) + '\\n\\n见字如晤，展信舒颜\\n\\n' + text.trim() + '\\n\\n你的' + (isFromMe ? myName : partnerName) + '\\n' + timeStr;
                const letter = { type: 'letter', text: formattedText, isMe: isFromMe, timestamp: now.toISOString(), read: true, replyTo,
                    reply: null, contactId: currentContactId };
                const id = await addData('letters', letter);
                letter.id = id;
                letters.push(letter);
                if (replyTo) { const o = letters.find(l => l.id === replyTo); if (o) { o.reply = id;
                        await updateData('letters', o); } }
                renderLetterList();
                showToast(isFromMe ? '信件已发送 ✉️' : '已代为写信 ✍️');
                if (isFromMe) {
                    var allCards = buildWordCardPool(currentContactId);
                    if (allCards.length > 0) {
                        const min = getContactReplySetting(contact, 'letterReplyMin') * 1000;
                        const max = getContactReplySetting(contact, 'letterReplyMax') * 1000;
                        const delay = min + Math.random() * (max - min);
                        const dueTime = Date.now() + delay;
                        settings.pendingLetterReplies.push({ dueTime, contactId: currentContactId, replyToId: id });
                        saveSettings();
                        setTimeout(() => executeLetterReply(currentContactId, id), delay);
                    }
                }
            }
            function formatLetterText(text, author) {
                const lines = (text || '').split('\n');
                let html = '';
                let inQuote = false;
                for (let i = 0; i < lines.length; i++) {
                    const raw = lines[i];
                    const line = raw.trim();
                    if (line.startsWith('> ')) {
                        if (!inQuote) { html += '<div class="letter-quote">'; inQuote = true; }
                        html += escapeHtml(line.replace(/^>\s?/, '')) + '<br>';
                        continue;
                    }
                    if (inQuote) { html += '</div>'; inQuote = false; }
                    if (i === 0 && line.startsWith('亲爱的')) {
                        html += '<div class="letter-greeting">' + escapeHtml(line) + '</div>';
                    } else if (line === '见字如晤，展信舒颜' || line.startsWith('见字如晤')) {
                        html += '<div class="letter-salute">' + escapeHtml(line) + '</div>';
                    } else if (line.startsWith('你的')) {
                        html += '<div class="letter-closing">' + escapeHtml(line) + '</div>';
                    } else if (i === lines.length - 1 && line.length > 0 && /^\d/.test(line) && line.indexOf('-') > 0) {
                        html += '<div class="letter-date">' + escapeHtml(line) + '</div>';
                    } else if (line.length > 0) {
                        html += '<div class="letter-body">' + escapeHtml(line) + '</div>';
                    } else {
                        html += '<div class="h-2"></div>';
                    }
                }
                if (inQuote) html += '</div>';
                return html;
            }
            function renderLetterPaper(letter, author, isReply) {
                const borderColor = isReply ? 'border-l-[var(--theme)]' : 'border-l-amber-600';
                const text = letter.text || '';
                const formatted = formatLetterText(text, author);
                return '<div class="letter-paper ' + borderColor + ' border-l-4">
                    <p class="text-xs text-[var(--text-secondary)] mb-2 flex justify-between">
                        <span>' + (author || 'TA') + '</span>
                        <span>' + formatDateTime(letter.timestamp) + '</span>
                    </p>
                    <div class="text-sm leading-relaxed">' + formatted + '</div>
                </div>';
            }

            function assembleLetterFromCards(cards, contact) {
                var body = cards.join('，') + '。';
                var now = new Date();
                var timeStr = now.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' + now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                return '亲爱的' + settings.myName + '\\n\\n见字如晤，展信舒颜\\n\\n' + body + '\\n\\n你的' + contact.name + '\\n' + timeStr;
            }

            window.openLetterComposeWithReply = function(letterId) {
                var letter = letters.find(function(l) { return l.id === letterId; });
                if (!letter) { showToast('未找到原信'); return; }
                var refContainer = document.getElementById('compose-reply-ref');
                var refContent = document.getElementById('compose-reply-content');
                if (refContainer && refContent) {
                    refContainer.classList.remove('hidden');
                    refContent.innerHTML = escapeHtml(letter.text || '');
                }
                document.getElementById('compose-letter-text').value = '';
                document.getElementById('letter-compose').classList.add('open');
            };

            async function executeLetterReply(contactId, replyToId) {
                const contact = contacts.find(c => c.id === contactId);
                if (!contact) return;
                const allCards = buildWordCardPool(contactId);
                if (!allCards.length) return;
                const cardMin = getContactReplySetting(contact, 'letterCardCountMin');
                const cardMax = getContactReplySetting(contact, 'letterCardCountMax');
                const wordCount = cardMin + Math.floor(Math.random() * (cardMax - cardMin + 1));
                const parts = [];
                for (let i = 0; i < wordCount; i++) { parts.push(allCards[Math.floor(Math.random() * allCards.length)]); }
                const replyText = assembleLetterFromCards(parts, contact);
                const replyLetter = { type: 'letter', text: replyText, isMe: false, timestamp: new Date().toISOString(),
                    read: false, replyTo: replyToId, reply: null, contactId };
                const rid = await addData('letters', replyLetter);
                replyLetter.id = rid;
                letters.push(replyLetter);
                const original = letters.find(l => l.id === replyToId);
                if (original) { original.reply = rid;
                    await updateData('letters', original); }
                if (currentContactId === contactId) renderLetterList();
                showLetterNotification('对方给你回信啦 💌');
            }
            async function processPendingLetterReplies() {
                if (!settings.pendingLetterReplies) return;
                const now = Date.now();
                const remaining = [];
                for (const p of settings.pendingLetterReplies) {
                    if (p.dueTime <= now) await executeLetterReply(p.contactId, p.replyToId);
                    else { remaining.push(p);
                        setTimeout(() => executeLetterReply(p.contactId, p.replyToId), p.dueTime - now); }
                }
                settings.pendingLetterReplies = remaining;
                saveSettings();
            }

            // ===== 原有心情模块函数（完全保留） =====
            function renderMoodEmojiPicker() {
                const picker = document.getElementById('mood-emoji-picker');
                if (!picker) return;
                picker.innerHTML = '';
                if (!settings.moodSymbols?.length) { settings.moodSymbols = DEFAULT_MOOD_SYMBOLS;
                    saveSettings(); }
                settings.moodSymbols.forEach(s => {
                    const span = document.createElement('span');
                    span.className = 'mood-emoji cursor-pointer';
                    span.dataset.mood = s.emoji;
                    span.textContent = s.emoji;
                    span.title = s.name + ' - ' + s.description;
                    span.onclick = function() { document.querySelectorAll('#mood-emoji-picker .mood-emoji').forEach(e => e
                            .classList.remove('selected'));
                        this.classList.add('selected'); };
                    picker.appendChild(span);
                });
                if (picker.firstChild) picker.firstChild.click();
            }

            async function saveMyMood() {
                const contact = getCurrentContact();
                const selected = document.querySelector('#mood-emoji-picker .mood-emoji.selected');
                const mood = selected?.dataset.mood || '😊';
                const note = document.getElementById('mood-note').value.trim();
                const weather = document.getElementById('mood-weather')?.value.trim() || '';
                const todayStr = formatDateISO(new Date());
                if (!settings.myMoodHistory) settings.myMoodHistory = [];
                settings.myMoodHistory = settings.myMoodHistory.filter(m => !(m.date === todayStr && m.contactId ===
                    currentContactId));
                settings.myMoodHistory.unshift({ mood, note, weather, date: todayStr, contactId: currentContactId });
                saveSettings();
                document.getElementById('mood-panel').classList.add('hidden');
                document.getElementById('mood-note').value = '';
                const weatherInput = document.getElementById('mood-weather');
                if (weatherInput) weatherInput.value = '';
                renderMoodCalendar();
                renderMoodStats();
            }

            function drawThreeWordCards(contactId) {
                const pool = buildWordCardPool(contactId);
                if (!pool.length) return [];
                const shuffled = pool.sort(() => Math.random() - 0.5);
                return shuffled.slice(0, 3);
            }

            function renderMoodCalendar() {
                const year = currentCalendarDate.getFullYear();
                const month = currentCalendarDate.getMonth();
                const monthLabel = document.getElementById('current-month');
                if (monthLabel) monthLabel.textContent = `${year}年${month + 1}月`;
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const today = new Date();
                const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
                const calendar = document.getElementById('mood-calendar');
                if (!calendar) return;
                calendar.innerHTML = '';
                const contact = getCurrentContact();
                for (let i = 0; i < firstDay; i++) {
                    const empty = document.createElement('div');
                    empty.className = 'mood-calendar-grid-cell';
                    empty.style.visibility = 'hidden';
                    calendar.appendChild(empty);
                }
                for (let day = 1; day <= daysInMonth; day++) {
                    const cell = document.createElement('div');
                    cell.className = 'mood-calendar-grid-cell';
                    const dateStr = formatDateISO(new Date(year, month, day));
                    const myMood = (settings.myMoodHistory || []).find(m => m.date === dateStr && m.contactId ===
                        currentContactId);
                    const partnerMood = contact?.partnerMoodHistory?.find(m => m.date === dateStr);
                    if (isCurrentMonth && day === today.getDate()) cell.classList.add('today');
                    if (myMood) cell.classList.add('has-my-mood');
                    const dayNum = document.createElement('div');
                    dayNum.className = 'cell-day';
                    dayNum.textContent = day;
                    cell.appendChild(dayNum);
                    const moodDiv = document.createElement('div');
                    moodDiv.className = 'cell-mood';
                    let moodHtml = '';
                    if (partnerMood?.emoji) {
                        moodHtml += `<div style="font-size:0.9rem; line-height:1.2;">${escapeHtml(partnerMood.emoji)}</div>`;
                    }
                    if (myMood?.mood) {
                        moodHtml += `<div style="font-size:0.9rem; line-height:1.2;">${escapeHtml(myMood.mood)}</div>`;
                    }
                    if (moodHtml) {
                        moodDiv.innerHTML = moodHtml;
                        moodDiv.style.display = 'flex';
                        moodDiv.style.flexDirection = 'column';
                        moodDiv.style.alignItems = 'center';
                        moodDiv.style.justifyContent = 'center';
                        moodDiv.style.gap = '0px';
                    } else {
                        moodDiv.innerHTML = '&nbsp;';
                        moodDiv.style.minHeight = '1.4rem';
                    }
                    cell.appendChild(moodDiv);
                    cell.dataset.date = dateStr;
                    cell.onclick = () => showDayMoodDetail(dateStr);
                    calendar.appendChild(cell);
                }
            }

            function renderSingleStats(history) {
                if (!history.length) {
                    return `<div class="empty-state" style="padding: 16px;"><div class="empty-icon" style="font-size: 2rem;">📭</div><p class="text-xs">暂无记录</p></div>`;
                }
                const counts = {};
                history.forEach(entry => {
                    const emoji = entry.mood || entry.emoji || '😊';
                    counts[emoji] = (counts[emoji] || 0) + 1;
                });
                const total = history.length;
                const emojiNames = {};
                settings.moodSymbols.forEach(s => { emojiNames[s.emoji] = s.name; });
                const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                let html = `<div class="text-xs text-[var(--text-secondary)] mb-2">共 ${total} 条记录</div>`;
                sorted.forEach(([emoji, count]) => {
                    const pct = Math.round((count / total) * 100);
                    const name = emojiNames[emoji] || '其他';
                    html += `
                        <div class="stat-card">
                            <div class="stat-emoji">${escapeHtml(emoji)}</div>
                            <div class="stat-info">
                                <div class="stat-name">${escapeHtml(name)}</div>
                                <div class="stat-count">${count} 次 · ${pct}%</div>
                            </div>
                            <div class="stat-bar"><div class="stat-bar-fill" style="width:${pct}%"></div></div>
                        </div>
                    `;
                });
                return html;
            }

            function renderMoodStats() {
                const myContainer = document.getElementById('my-mood-stats-list');
                const partnerContainer = document.getElementById('partner-mood-stats-list');
                const partnerNameEl = document.getElementById('partner-stats-name');
                if (!myContainer || !partnerContainer) return;
                const contact = getCurrentContact();
                const myHistory = (settings.myMoodHistory || []).filter(m => m.contactId === currentContactId);
                const partnerHistory = contact?.partnerMoodHistory || [];
                if (partnerNameEl && contact) partnerNameEl.textContent = contact.name;
                myContainer.innerHTML = renderSingleStats(myHistory);
                partnerContainer.innerHTML = renderSingleStats(partnerHistory);
            }

            function renderMoodRecycle() {
                const container = document.getElementById('mood-recycle-list');
                if (!container) return;
                const bin = settings.moodRecycleBin || [];
                if (!bin.length) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">♻️</div>
                            <p>回收站为空</p>
                            <p class="text-xs mt-1">删除的心情记录会出现在这里</p>
                        </div>
                    `;
                    return;
                }
                container.innerHTML = bin.map((item, idx) => `
                    <div class="recycle-item">
                        <div class="recycle-info">
                            <span class="r-emoji">${escapeHtml(item.mood)}</span>
                            <div>
                                <div class="r-text">${escapeHtml(item.date)} ${escapeHtml(item.note || '')}</div>
                                <div class="text-xs text-[var(--text-secondary)]">${formatTimeAgo(item.deletedAt)}</div>
                            </div>
                        </div>
                        <div class="recycle-actions flex space-x-1">
                            <button class="restore-btn" data-idx="${idx}">↩ 恢复</button>
                            <button class="delete-forever-btn" data-idx="${idx}">🗑 删除</button>
                        </div>
                    </div>
                `).join('');
                container.querySelectorAll('.restore-btn').forEach(btn => {
                    btn.onclick = () => restoreMoodFromRecycle(parseInt(btn.dataset.idx));
                });
                container.querySelectorAll('.delete-forever-btn').forEach(btn => {
                    btn.onclick = () => deleteMoodForever(parseInt(btn.dataset.idx));
                });
            }

            function restoreMoodFromRecycle(idx) {
                const bin = settings.moodRecycleBin || [];
                if (idx < 0 || idx >= bin.length) return;
                const item = bin.splice(idx, 1)[0];
                if (!settings.myMoodHistory) settings.myMoodHistory = [];
                settings.myMoodHistory.unshift({ mood: item.mood, note: item.note || '', weather: item.weather || '', date: item.date, contactId: item.contactId || currentContactId });
                saveSettings();
                renderMoodRecycle();
                renderMoodCalendar();
                renderMoodStats();
                showToast('已恢复');
            }

            function deleteMoodForever(idx) {
                const bin = settings.moodRecycleBin || [];
                if (idx < 0 || idx >= bin.length) return;
                if (!confirm('确定永久删除这条心情记录？')) return;
                bin.splice(idx, 1);
                saveSettings();
                renderMoodRecycle();
                showToast('已永久删除');
            }

            function showDayMoodDetail(dateStr) {
                const date = new Date(dateStr);
                const contact = getCurrentContact();
                const myMood = (settings.myMoodHistory || []).find(m => m.date === dateStr && m.contactId ===
                    currentContactId);
                const partnerMood = contact?.partnerMoodHistory?.find(m => m.date === dateStr);
                const isToday = formatDateISO(new Date()) === dateStr;
                const title = document.getElementById('mood-day-title');
                if (title) title.textContent = `${date.getMonth() + 1}月${date.getDate()}日 心情详情`;
                let html = '';
                html += `<div class="mb-4 p-4 bg-[var(--card-bg)] rounded-2xl">`;
                html += `<p class="text-sm font-medium mb-2" style="color:var(--text-primary);">💖 我的心情</p>`;
                if (myMood) {
                    html += `<div class="detail-emoji">${escapeHtml(myMood.mood)}</div>`;
                    if (myMood.weather) html +=
                        `<div class="text-center text-sm text-[var(--text-secondary)]">🌤 ${escapeHtml(myMood.weather)}</div>`;
                    html +=
                        `<div class="mt-2 text-sm text-[var(--text-primary)]">${escapeHtml(myMood.note || '')}</div>`;
                } else {
                    html += `<div class="text-center text-[var(--text-secondary)] py-2">还没有记录</div>`;
                }
                html += `</div>`;
                html += `<div class="mb-4 p-4 bg-[var(--card-bg)] rounded-2xl">`;
                html += `<p class="text-sm font-medium mb-2" style="color:var(--text-primary);">${escapeHtml(contact?.name || 'TA')} 的心情</p>`;
                if (partnerMood) {
                    html += `<div class="detail-emoji">${escapeHtml(partnerMood.emoji)}</div>`;
                    if (partnerMood.weather) html +=
                        `<div class="text-center text-sm text-[var(--text-secondary)]">🌤 ${escapeHtml(partnerMood.weather)}</div>`;
                    if (partnerMood.cards?.length) {
                        html += `<div class="detail-cards">${partnerMood.cards.map(c => `<span>${escapeHtml(c)}</span>`).join('')}</div>`;
                    }
                } else {
                    html += `<div class="text-center text-[var(--text-secondary)] py-2">TA还没有记录</div>`;
                }
                html += `</div>`;
                if (isToday) {
                    html +=
                        `<button id="record-today-mood-btn" class="w-full py-3 text-white rounded-xl text-sm" style="background:var(--theme)">💝 记录今日心情</button>`;
                }
                if (myMood) {
                    html += `<button id="delete-my-mood-btn" class="w-full py-2 mt-2 bg-red-50 text-red-500 rounded-xl text-sm">🗑 删除这条心情记录</button>`;
                }
                html += `<button id="show-chat-for-date-btn" class="w-full py-2 mt-2 bg-[var(--theme-light)] rounded-xl text-sm">📅 查看聊天记录</button>`;
                const content = document.getElementById('mood-day-content');
                if (content) {
                    content.innerHTML = html;
                    document.getElementById('mood-day-detail').classList.add('open');
                    var recordBtn = document.getElementById('record-today-mood-btn');
                    if (recordBtn) {
                        recordBtn.onclick = function() {
                            document.getElementById('mood-day-detail').classList.remove('open');
                            document.getElementById('mood-panel').classList.remove('hidden');
                            renderMoodEmojiPicker();
                        };
                    }
                    var deleteBtn = document.getElementById('delete-my-mood-btn');
                    if (deleteBtn) {
                        deleteBtn.onclick = function() {
                            if (!confirm('将这条心情记录移到回收站？')) return;
                            const idx = (settings.myMoodHistory || []).findIndex(m => m.date === dateStr && m.contactId === currentContactId);
                            if (idx >= 0) {
                                const item = settings.myMoodHistory.splice(idx, 1)[0];
                                if (!settings.moodRecycleBin) settings.moodRecycleBin = [];
                                settings.moodRecycleBin.unshift({ ...item, deletedAt: new Date().toISOString() });
                                saveSettings();
                                document.getElementById('mood-day-detail').classList.remove('open');
                                renderMoodCalendar();
                                renderMoodStats();
                                showToast('已移到回收站');
                            }
                        };
                    }
                    document.getElementById('show-chat-for-date-btn').onclick = function() {
                        showChatHistoryForDate(dateStr);
                    };
                }
            }

            function showChatHistoryForDate(dateStr) {
                var contact = getCurrentContact();
                if (!contact) return;
                var allMsgs = cachedContactMessages[currentContactId || contact.id] || messages;
                var dayMsgs = allMsgs.filter(function(m) {
                    var md = m.timestamp ? m.timestamp.substring(0, 10) : '';
                    return md === dateStr;
                });
                var title = document.getElementById('mood-day-title');
                if (title) title.textContent = dateStr + ' 聊天记录';
                var html = '';
                if (!dayMsgs.length) {
                    html = '<div class="text-center text-[var(--text-secondary)] py-8">当天没有聊天记录</div>';
                } else {
                    dayMsgs.forEach(function(m) {
                        var who = m.isMe ? '我' : (contact.name || 'TA');
                        var txt = m.type === 'text' ? escapeHtml(m.text) : (m.type === 'image' ? '[图片]' : (m.type === 'voice' ? '[语音]' : (m.type === 'pat' ? m.text : (m.type === 'call' ? m.text : '[消息]'))));
                        var time = m.timestamp ? m.timestamp.substring(11, 19) : '';
                        html += '<div class="flex ' + (m.isMe ? 'justify-end' : 'justify-start') + ' mb-2">';
                        html += '<div class="max-w-[80%] px-3 py-2 rounded-xl text-xs ' + (m.isMe ? 'bg-[var(--theme-light)]' : 'bg-[var(--card-bg)]') + '" style="border:1px solid var(--border-color)">';
                        html += '<p class="text-[var(--text-secondary)] text-[0.6rem] mb-1">' + who + ' ' + time + '</p>';
                        html += '<p>' + txt + '</p></div></div>';
                    });
                }
                html += '<button id="back-to-mood-detail" class="w-full py-2 mt-2 bg-[var(--theme-light)] rounded-xl text-sm">← 返回心情详情</button>';
                var content = document.getElementById('mood-day-content');
                if (content) {
                    content.innerHTML = html;
                    content.scrollTop = 0;
                    document.getElementById('back-to-mood-detail').onclick = function() {
                        showDayMoodDetail(dateStr);
                    };
                }
            }

            function switchMoodTab(tab) {
                document.querySelectorAll('.mood-tab-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.tab === tab);
                });
                document.querySelectorAll('.mood-tab-content').forEach(el => {
                    el.classList.toggle('active', el.id === `mood-${tab}-content`);
                });
                if (tab === 'calendar') renderMoodCalendar();
                else if (tab === 'stats') renderMoodStats();
                else if (tab === 'recycle') renderMoodRecycle();
            }

            function renderMoodSelectorGrid() {
                const grid = document.getElementById('mood-selector-grid');
                if (!grid) return;
                grid.innerHTML = '';
                if (!settings.moodSymbols?.length) { settings.moodSymbols = DEFAULT_MOOD_SYMBOLS;
                    saveSettings(); }
                settings.moodSymbols.forEach(s => {
                    const div = document.createElement('div');
                    div.className = 'mood-option';
                    div.dataset.emoji = s.emoji;
                    div.innerHTML = `
                        <div class="m-emoji">${escapeHtml(s.emoji)}</div>
                        <div class="m-name">${escapeHtml(s.name)}</div>
                    `;
                    div.onclick = function() {
                        document.querySelectorAll('#mood-selector-grid .mood-option').forEach(el => el.classList.remove(
                            'selected'));
                        this.classList.add('selected');
                        document.getElementById('new-mood-emoji').value = this.dataset.emoji;
                        document.getElementById('new-mood-name').value = this.querySelector('.m-name').textContent;
                    };
                    grid.appendChild(div);
                });
                if (grid.firstChild) grid.firstChild.classList.add('selected');
            }

            function startMoodRefreshTimer() {
                if (moodRefreshTimer) clearTimeout(moodRefreshTimer);
                const now = new Date();
                const refreshPoint = new Date(now);
                refreshPoint.setHours(settings.moodRefreshHour, 0, 0, 0);
                if (now >= refreshPoint) {
                    refreshMoodForAll();
                    refreshPoint.setDate(refreshPoint.getDate() + 1);
                }
                const delay = refreshPoint.getTime() - now.getTime();
                moodRefreshTimer = setTimeout(() => {
                    refreshMoodForAll();
                    startMoodRefreshTimer();
                }, delay);
            }

            function startMoodIndexTimer() {
                if (window._moodIndexTimer) clearInterval(window._moodIndexTimer);
                window._moodIndexTimer = setInterval(function() {
                    contacts.forEach(function(c) {
                        if (c.partnerMoodIndex === undefined) c.partnerMoodIndex = 50;
                        var delta = Math.floor(Math.random() * 11) - 5;
                        c.partnerMoodIndex = Math.max(0, Math.min(100, c.partnerMoodIndex + delta));
                    });
                    updateMoodIndexDisplay();
                }, 300000);
            }
            function updateMoodIndexDisplay() {
                var el = document.getElementById('partner-mood-index');
                var chEl = document.getElementById('ch-partner-mood');
                if (!el && !chEl) return;
                var contact = getCurrentContact();
                if (!contact || currentChatType === 'group') {
                    if (el) el.textContent = '';
                    if (chEl) chEl.textContent = '';
                    return;
                }
                var pct = contact.partnerMoodIndex !== undefined ? contact.partnerMoodIndex : 50;
                var txt = pct + '%';
                if (el) { el.textContent = txt; el.style.color = pct > 60 ? 'var(--theme)' : 'var(--text-secondary)'; }
                if (chEl) { chEl.textContent = txt; chEl.style.color = pct > 60 ? 'var(--theme)' : 'var(--text-secondary)'; }
            }
            function updateMyMoodDisplay() {
                if (settings.myMoodIndex === undefined) settings.myMoodIndex = 50 + Math.floor(Math.random() * 50);
                var el = document.getElementById('my-mood');
                var chEl = document.getElementById('ch-my-mood');
                var pct = settings.myMoodIndex;
                var txt = pct + '%';
                var color = pct > 60 ? 'var(--theme)' : 'var(--text-secondary)';
                function moodClickHandler() {
                    var n = prompt('输入你的心情百分比（0-100）', settings.myMoodIndex);
                    if (n !== null) {
                        var v = parseInt(n);
                        if (!isNaN(v)) { settings.myMoodIndex = Math.max(0, Math.min(100, v)); saveSettings(); updateMyMoodDisplay(); }
                    }
                }
                if (el) { el.textContent = txt; el.style.color = color; el.onclick = moodClickHandler; el.style.cursor = 'pointer'; }
                if (chEl) { chEl.textContent = txt; chEl.style.color = color; chEl.onclick = moodClickHandler; chEl.style.cursor = 'pointer'; }
            }
            function updateHeaderClock() {
                var timeEl = document.getElementById('my-time');
                var partnerTimeEl = document.getElementById('partner-time');
                var chTimeEl = document.getElementById('ch-my-time');
                var chPartnerTimeEl = document.getElementById('ch-partner-time');
                if (!timeEl && !chTimeEl) return;
                var now = new Date();
                var myTimeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
                if (timeEl) timeEl.textContent = myTimeStr;
                if (chTimeEl) chTimeEl.textContent = myTimeStr;
                if (partnerTimeEl || chPartnerTimeEl) {
                    var contact = getCurrentContact();
                    if (contact && currentChatType !== 'group') {
                        var offset = contact.timezoneOffset || 0;
                        var speed = contact.timeFlowSpeed || 1;
                        if (!contact._timeBase) contact._timeBase = { realStart: Date.now(), virtStart: new Date() };
                        var elapsed = (Date.now() - contact._timeBase.realStart) * speed;
                        var virtNow = new Date(contact._timeBase.virtStart.getTime() + elapsed);
                        var utc = virtNow.getTime() + virtNow.getTimezoneOffset() * 60000;
                        var localTime = new Date(utc + offset * 3600000);
                        var partnerTimeStr = localTime.getHours().toString().padStart(2, '0') + ':' + localTime.getMinutes().toString().padStart(2, '0');
                        if (partnerTimeEl) { partnerTimeEl.textContent = partnerTimeStr; partnerTimeEl.title = 'TA的当地时间 (流速' + speed + 'x)'; }
                        if (chPartnerTimeEl) { chPartnerTimeEl.textContent = partnerTimeStr; chPartnerTimeEl.title = 'TA的当地时间 (流速' + speed + 'x)'; }
                    } else {
                        if (partnerTimeEl) { partnerTimeEl.textContent = '--:--'; partnerTimeEl.title = ''; }
                        if (chPartnerTimeEl) { chPartnerTimeEl.textContent = '--:--'; chPartnerTimeEl.title = ''; }
                    }
                }
            }
            function updateHeaderTimezone() {
                updateHeaderClock();
            }
            function updateHeaderBattery() {
                // My real battery
                var myEl = document.getElementById('my-battery');
                var chMyEl = document.getElementById('ch-my-battery');
                if (myEl || chMyEl) {
                    var level = window._batteryLevel;
                    if (level !== undefined) {
                        var icon = 'fa-battery-empty';
                        if (level > 75) icon = 'fa-battery-full';
                        else if (level > 50) icon = 'fa-battery-three-quarters';
                        else if (level > 25) icon = 'fa-battery-half';
                        else if (level > 10) icon = 'fa-battery-quarter';
                        var html = '<i class="fa ' + icon + '" style="margin-right:1px;"></i>' + level + '%';
                        if (myEl) myEl.innerHTML = html;
                        if (chMyEl) chMyEl.innerHTML = html;
                    } else { if (myEl) myEl.textContent = ''; if (chMyEl) chMyEl.textContent = ''; }
                }
                // Partner random battery
                var partnerEl = document.getElementById('partner-battery');
                var chPartnerEl = document.getElementById('ch-partner-battery');
                if (!partnerEl && !chPartnerEl) return;
                var contact = getCurrentContact();
                if (!contact || currentChatType === 'group') {
                    if (partnerEl) partnerEl.textContent = '';
                    if (chPartnerEl) chPartnerEl.textContent = '';
                    return;
                }
                if (contact._battery === undefined || Math.random() < 0.05) {
                    contact._battery = Math.floor(Math.random() * 101);
                }
                var pct = contact._battery;
                var icon = 'fa-battery-empty';
                if (pct > 75) icon = 'fa-battery-full';
                else if (pct > 50) icon = 'fa-battery-three-quarters';
                else if (pct > 25) icon = 'fa-battery-half';
                else if (pct > 10) icon = 'fa-battery-quarter';
                var html = '<i class="fa ' + icon + '" style="margin-right:1px;"></i>' + pct + '%';
                if (partnerEl) partnerEl.innerHTML = html;
                if (chPartnerEl) chPartnerEl.innerHTML = html;
            }
            function startBatteryMonitor() {
                if (navigator.getBattery) {
                    navigator.getBattery().then(function(b) {
                        window._batteryLevel = Math.round(b.level * 100);
                        updateHeaderBattery();
                        b.addEventListener('levelchange', function() { window._batteryLevel = Math.round(b.level * 100); updateHeaderBattery(); });
                    });
                }
                updateHeaderBattery();
            }

            async function refreshMoodForAll() {
                const todayStr = formatDateISO(new Date());
                const weathers = getWeatherPool();
                for (const contact of contacts) {
                    if (!contact.partnerMoodHistory) contact.partnerMoodHistory = [];
                    const existing = contact.partnerMoodHistory.find(m => m.date === todayStr);
                    if (!existing) {
                        if (Math.random() > 0.8) continue;
                        const emoji = settings.moodSymbols.length ? settings.moodSymbols[Math.floor(Math.random() * settings
                            .moodSymbols.length)].emoji : '😊';
                        const cardCount = 1 + Math.floor(Math.random() * 3);
                        const cards = [];
                        const pool = buildWordCardPool(contact.id);
                        if (pool.length) { for (let i = 0; i < cardCount; i++) cards.push(pool[Math.floor(Math.random() *
                                pool.length)]); }
                        const weather = weathers[Math.floor(Math.random() * weathers.length)] || '';
                        contact.partnerMoodHistory.push({ date: todayStr, emoji, note: '', cards, weather });
                        await updateContact(contact);
                    }
                }
                if (currentChatType === 'private' && currentContactId) {
                    renderMoodCalendar();
                    renderMoodStats();
                }
            }

            // ===== 经期模块函数 =====

            // 切换模块
            function switchModule(module) {
                currentModule = module;
                const title = document.getElementById('mood-panel-title');
                const moodAddBtn = document.getElementById('add-mood-from-calendar');
                const periodAddBtn = document.getElementById('add-period-from-calendar');

                if (module === 'mood') {
                    if (title) title.textContent = '📔 心晴手账';
                    var mtc = document.getElementById('mood-tabs-container');
                    if (mtc) mtc.classList.remove('hidden');
                    var ptc = document.getElementById('period-tabs-container');
                    if (ptc) ptc.classList.add('hidden');
                    document.getElementById('mood-content-area').classList.remove('hidden');
                    document.getElementById('period-content-area').classList.add('hidden');
                    if (moodAddBtn) moodAddBtn.classList.remove('hidden');
                    if (periodAddBtn) periodAddBtn.classList.add('hidden');
                    renderMoodCalendar();
                } else {
                    if (title) title.textContent = '🩸 经期记录';
                    var mtc = document.getElementById('mood-tabs-container');
                    if (mtc) mtc.classList.add('hidden');
                    var ptc = document.getElementById('period-tabs-container');
                    if (ptc) ptc.classList.remove('hidden');
                    document.getElementById('mood-content-area').classList.add('hidden');
                    document.getElementById('period-content-area').classList.remove('hidden');
                    if (periodAddBtn) periodAddBtn.classList.remove('hidden');
                    if (moodAddBtn) moodAddBtn.classList.add('hidden');
                    renderPeriodCalendar();
                }
            }

            // 经期Tab切换
            function switchPeriodTab(tab) {
                currentPeriodTab = tab;
                document.querySelectorAll('.period-tab-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.tab === tab);
                });
                document.querySelectorAll('.period-tab-content').forEach(el => {
                    el.classList.toggle('active', el.id === `period-${tab}-content`);
                });
                if (tab === 'calendar') renderPeriodCalendar();
                else if (tab === 'stats') renderPeriodStats();
                else if (tab === 'settings') renderPeriodSettings();
            }

            // 判断日期类型（经期）
            function getPeriodDayType(dateStr, record, predictions) {
                if (record?.isPeriod) return 'period';
                for (const p of predictions) {
                    if (dateStr >= p.startDate && dateStr <= p.endDate) return 'predicted';
                    if (dateStr >= p.ovulationStart && dateStr <= p.ovulationEnd) return 'ovulation';
                    if (dateStr > p.endDate && dateStr < p.ovulationStart) return 'follicular';
                    if (dateStr > p.ovulationEnd && dateStr < p.startDate) return 'luteal';
                }
                return 'safe';
            }

            async function markPeriodRecordsViewed() {
                var twoDaysAgo = new Date();
                twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                var cutoff = formatDateISO(twoDaysAgo);
                var updated = false;
                for (var i = 0; i < periodRecords.length; i++) {
                    if (!periodRecords[i].partnerViewedAt && periodRecords[i].date <= cutoff) {
                        periodRecords[i].partnerViewedAt = new Date().toISOString();
                        await updateData('periodRecords', periodRecords[i]);
                        updated = true;
                    }
                }
                if (updated) { var cal = document.getElementById('period-calendar'); if (cal && cal.children.length) renderPeriodCalendar(); }
            }

            // 预测算法
            function predictPeriods() {
                const ps = settings.period || {};
                const avgCycle = ps.averageCycle || 28;
                const avgPeriod = ps.averagePeriod || 5;
                const lastStart = ps.lastPeriodStart;
                if (!lastStart) return [];
                const predictions = [];
                const startDateObj = new Date(lastStart);
                for (let i = 1; i <= 3; i++) {
                    const start = new Date(startDateObj);
                    start.setDate(start.getDate() + avgCycle * i);
                    const end = new Date(start);
                    end.setDate(end.getDate() + avgPeriod - 1);
                    const ovStart = new Date(start);
                    ovStart.setDate(ovStart.getDate() - 14);
                    const ovEnd = new Date(start);
                    ovEnd.setDate(ovEnd.getDate() - 10);
                    predictions.push({
                        startDate: formatDateISO(start),
                        endDate: formatDateISO(end),
                        ovulationStart: formatDateISO(ovStart),
                        ovulationEnd: formatDateISO(ovEnd)
                    });
                }
                return predictions;
            }

            function addDays(dateStr, days) {
                const d = new Date(dateStr);
                d.setDate(d.getDate() + days);
                return formatDateISO(d);
            }

            // ===== 重写：经期统计模块 =====
            function renderPeriodStats() {
                const container = document.getElementById('period-stats-container');
                if (!container) return;

                const ps = settings.period || {};
                const avgCycle = ps.averageCycle || 28;
                const avgPeriod = ps.averagePeriod || 5;
                const contactCyclesAll = periodCycles.filter(c => c.contactId === currentContactId);
                const totalCycles = contactCyclesAll.length;
 
                // 计算规律性
                let regularity = '--';
                if (contactCyclesAll.length >= 2) {
                    const lengths = contactCyclesAll.filter(c => c.cycleLength > 0).map(c => c.cycleLength);
                    if (lengths.length >= 2) {
                        const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
                        const variance = lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lengths.length;
                        const stdDev = Math.sqrt(variance);
                        if (stdDev <= 3) regularity = '非常规律';
                        else if (stdDev <= 5) regularity = '基本规律';
                        else if (stdDev <= 8) regularity = '不太规律';
                        else regularity = '不规律';
                    }
                }

                // ===== 1. 周期概览 =====
                let html = `
                    <div class="mb-5 p-4 bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)]">
                        <div class="grid grid-cols-3 gap-3 text-sm text-center">
                            <div>
                                <p class="text-[var(--text-secondary)] text-xs">平均周期</p>
                                <p class="text-lg font-semibold" style="color:var(--theme);">${avgCycle}天</p>
                            </div>
                            <div>
                                <p class="text-[var(--text-secondary)] text-xs">平均经期</p>
                                <p class="text-lg font-semibold" style="color:var(--theme);">${avgPeriod}天</p>
                            </div>
                            <div>
                                <p class="text-[var(--text-secondary)] text-xs">规律性</p>
                                <p class="text-lg font-semibold" style="color:var(--theme);">${regularity}</p>
                            </div>
                        </div>
                    </div>
                `;

                // ===== 2. 周期长度趋势（近6个月） =====
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                const recentCycles = periodCycles.filter(c => c.contactId === currentContactId && new Date(c.startDate) >= sixMonthsAgo).sort((a, b) => a
                    .startDate.localeCompare(b.startDate));
                if (recentCycles.length > 0) {
                    const maxCycle = Math.max(...recentCycles.map(c => c.cycleLength || 0), 28);
                    const minCycle = Math.min(...recentCycles.map(c => c.cycleLength || 0), 28);
                    const range = Math.max(maxCycle - minCycle, 4);
                    const chartHeight = 80;

                    let chartHtml = `
                        <div class="mb-4 p-3 bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)]">
                            <h4 class="text-sm font-semibold mb-3" style="color:var(--text-primary);">📈 周期长度趋势（近6个月）</h4>
                            <div class="trend-chart" style="height:${chartHeight + 20}px; padding-left:30px;">
                                <div class="y-label top" style="top:0;">${maxCycle}</div>
                                <div class="y-label mid" style="top:50%;">${Math.round((maxCycle + minCycle) / 2)}</div>
                                <div class="y-label bot" style="bottom:0;">${minCycle}</div>
                    `;
                    recentCycles.forEach((c, idx) => {
                        const val = c.cycleLength || 28;
                        const pct = Math.max(4, Math.min(100, ((val - minCycle) / range) * 100));
                        const label = c.startDate.slice(5, 7) + '月';
                        chartHtml += `
                            <div class="bar" style="flex:1;">
                                <div class="bar-value" style="font-size:0.55rem;margin-bottom:2px;">${val}</div>
                                <div class="bar-fill" style="height:${pct}%;background:var(--theme);"></div>
                                <div class="bar-label" style="font-size:0.55rem;">${label}</div>
                            </div>
                        `;
                    });
                    chartHtml += `</div></div>`;
                    html += chartHtml;
                }

                // ===== 3. 经期症状统计（近3个月） =====
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                const recentRecords = periodRecords.filter(r => r.contactId === currentContactId && new Date(r.date) >= threeMonthsAgo);

                if (recentRecords.length > 0) {
                    const symptomStats = {
                        pain: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 },
                        flow: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                        mood: {},
                        medicine: {}
                    };
                    recentRecords.forEach(r => {
                        if (r.pain !== undefined) symptomStats.pain[r.pain] = (symptomStats.pain[r.pain] || 0) + 1;
                        if (r.flow !== undefined) symptomStats.flow[r.flow] = (symptomStats.flow[r.flow] || 0) + 1;
                        (r.mood || []).forEach(m => { symptomStats.mood[m] = (symptomStats.mood[m] || 0) + 1; });
                        (r.medicine || []).forEach(m => { symptomStats.medicine[m] = (symptomStats.medicine[m] || 0) +
                                1; });
                    });

                    const painLabels = ['无', '轻微', '中等', '剧烈', '无法下床'];
                    const flowLabels = ['极少', '少量', '中等', '大量', '极多'];
                    const total = recentRecords.length;

                    html += `
                        <div class="mb-4 p-3 bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)]">
                            <h4 class="text-sm font-semibold mb-3" style="color:var(--text-primary);">📊 经期症状统计（近3个月，共${total}条记录）</h4>
                            <div class="space-y-2 text-sm">
                                <div>
                                    <p class="text-xs text-[var(--text-secondary)] mb-1">💧 流量</p>
                                    <div class="flex flex-wrap gap-2">
                                        ${Object.entries(symptomStats.flow).filter(([k,v]) => v > 0).map(([k,v]) => {
                                            const pct = Math.round((v / total) * 100);
                                            return `<span class="text-xs bg-[var(--theme-light)] px-2 py-0.5 rounded-full">${flowLabels[parseInt(k)-1]} ${pct}% (${v}次)</span>`;
                                        }).join('') || '<span class="text-xs text-[var(--text-secondary)]">暂无数据</span>'}
                                    </div>
                                </div>
                                <div>
                                    <p class="text-xs text-[var(--text-secondary)] mb-1">😣 痛感</p>
                                    <div class="flex flex-wrap gap-2">
                                        ${Object.entries(symptomStats.pain).filter(([k,v]) => v > 0).map(([k,v]) => {
                                            const pct = Math.round((v / total) * 100);
                                            return `<span class="text-xs bg-[var(--theme-light)] px-2 py-0.5 rounded-full">${painLabels[parseInt(k)]} ${pct}% (${v}次)</span>`;
                                        }).join('') || '<span class="text-xs text-[var(--text-secondary)]">暂无数据</span>'}
                                    </div>
                                </div>
                                <div>
                                    <p class="text-xs text-[var(--text-secondary)] mb-1">😤 情绪</p>
                                    <div class="flex flex-wrap gap-2">
                                        ${Object.entries(symptomStats.mood).filter(([k,v]) => v > 0).map(([k,v]) => {
                                            const pct = Math.round((v / total) * 100);
                                            return `<span class="text-xs bg-[var(--theme-light)] px-2 py-0.5 rounded-full">${k} ${pct}% (${v}次)</span>`;
                                        }).join('') || '<span class="text-xs text-[var(--text-secondary)]">暂无数据</span>'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }

                // ===== 4. 历史周期记录 =====
                const contactCycles = periodCycles.filter(c => c.contactId === currentContactId);
                if (contactCycles.length > 0) {
                    html += `
                        <div class="mb-4 p-3 bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)]">
                            <h4 class="text-sm font-semibold mb-3" style="color:var(--text-primary);">📋 历史周期记录</h4>
                            <div class="space-y-2">
                                ${contactCycles.slice().reverse().map(c => `
                                    <div class="flex items-center justify-between p-3 bg-[var(--card-bg)] rounded-xl text-sm border border-[var(--border-color)]">
                                        <div>
                                            <p class="font-medium" style="color:var(--text-primary);">${c.startDate} ~ ${c.endDate}</p>
                                            <p class="text-xs text-[var(--text-secondary)]">持续 ${c.duration} 天 · 周期 ${c.cycleLength || '--'} 天</p>
                                        </div>
                                        <button onclick="deletePeriodCycle(${c.id})" class="text-red-400 text-xs hover:text-red-600">
                                            <i class="fa fa-trash"></i>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }

                // ===== 5. 导出/导入按钮 =====
                html += `
                    <div class="flex space-x-2 mb-2">
                        <button id="export-period-data" class="flex-1 py-2.5 text-white rounded-xl text-sm" style="background:var(--theme)">
                            <i class="fa fa-download mr-1"></i>导出经期数据
                        </button>
                        <label class="flex-1 py-2.5 rounded-xl text-sm text-center cursor-pointer" style="background:var(--theme-light);color:var(--text-primary);">
                            <i class="fa fa-upload mr-1"></i>导入经期数据
                            <input type="file" id="import-period-data" accept=".json" class="hidden">
                        </label>
                    </div>
                `;

                container.innerHTML = html;

                document.getElementById('export-period-data').onclick = exportPeriodData;
                document.getElementById('import-period-data').onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (!confirm('导入经期数据将合并到现有记录中（按日期+联系人去重），确定继续吗？')) { e.target.value = ''; return; }
                    try {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        if (data.type !== 'period-data') { showToast('文件格式错误：不是经期数据导出文件'); e.target.value = ''; return; }
                        let addedRecords = 0, addedCycles = 0;
                        for (const r of (data.records || [])) {
                            const exists = periodRecords.find(x => x.date === r.date && x.contactId === r.contactId);
                            if (!exists) {
                                const id = await addData('periodRecords', r);
                                r.id = id;
                                periodRecords.push(r);
                                addedRecords++;
                            }
                        }
                        for (const c of (data.cycles || [])) {
                            delete c.id;
                            const id = await addData('periodCycles', c);
                            c.id = id;
                            periodCycles.push(c);
                            addedCycles++;
                        }
                        if (data.settings) {
                            settings.period = { ...settings.period, ...data.settings };
                            await saveSettings();
                        }
                        renderPeriodCalendar();
                        renderPeriodStats();
                        showToast(`导入完成：新增 ${addedRecords} 条记录，${addedCycles} 个周期 ✅`);
                    } catch (err) { showToast('导入失败：' + err.message); }
                    e.target.value = '';
                };
            }

            // 删除周期
            window.deletePeriodCycle = async function(id) {
                if (!confirm('确定删除这个周期记录吗？')) return;
                await deleteData('periodCycles', id);
                periodCycles = periodCycles.filter(c => c.id !== id);
                renderPeriodStats();
                showToast('已删除 ✅');
            };

            // 导出经期数据
            function exportPeriodData() {
                const data = {
                    type: 'period-data',
                    exportTime: new Date().toISOString(),
                    contactId: currentContactId,
                    records: periodRecords.filter(r => r.contactId === currentContactId),
                    cycles: periodCycles.filter(c => c.contactId === currentContactId),
                    settings: settings.period
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `LOVE_经期记录_${new Date().toISOString().slice(0,10)}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                showToast('导出成功 ✅');
            }

            // 渲染经期提醒设置（已删除密码部分）
            function renderPeriodSettings() {
                const container = document.getElementById('period-settings-container');
                if (!container) return;
                const ps = settings.period || {};

                container.innerHTML = `
                    <div class="space-y-4">
                        <div class="p-3 bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)]">
                            <h4 class="text-sm font-semibold mb-3">🔔 提醒开关</h4>
                            <div class="space-y-2 text-sm">
                                <label class="flex items-center justify-between">
                                    <span>经期开始提醒</span>
                                    <input type="checkbox" id="remind-period-start" ${ps.reminders?.periodStart ? 'checked' : ''}>
                                </label>
                                <label class="flex items-center justify-between">
                                    <span>经期结束提醒</span>
                                    <input type="checkbox" id="remind-period-end" ${ps.reminders?.periodEnd ? 'checked' : ''}>
                                </label>
                                <label class="flex items-center justify-between">
                                    <span>排卵期提醒</span>
                                    <input type="checkbox" id="remind-ovulation" ${ps.reminders?.ovulation ? 'checked' : ''}>
                                </label>
                                <label class="flex items-center justify-between">
                                    <span>下次经期预测</span>
                                    <input type="checkbox" id="remind-next-period" ${ps.reminders?.nextPeriod ? 'checked' : ''}>
                                </label>
                            </div>
                        </div>

                        <div class="p-3 bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)]">
                            <h4 class="text-sm font-semibold mb-3">⏰ 提醒时间</h4>
                            <div class="flex items-center space-x-2 text-sm mb-3">
                                <span>提前</span>
                                <input type="number" id="remind-days-before" value="${ps.reminders?.daysBefore || 2}" 
                                    class="w-14 px-2 py-1 border rounded text-center">
                                <span>天提醒</span>
                            </div>
                            <div class="flex items-center space-x-2 text-sm">
                                <span>提醒时间</span>
                                <input type="time" id="remind-time" value="${ps.reminders?.time || '08:00'}" 
                                    class="px-2 py-1 border rounded">
                            </div>
                        </div>

                        <div class="p-3 bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)]">
                            <h4 class="text-sm font-semibold mb-3">💬 提醒文案</h4>
                            <div class="space-y-2 text-sm">
                                <div>
                                    <label class="text-xs text-[var(--text-secondary)] block mb-1">经期开始</label>
                                    <input type="text" id="msg-period-start" value="${ps.customMessages?.periodStart || '大姨妈快来了，包包里放片卫生巾吧 🌸'}" 
                                        class="w-full px-3 py-2 border rounded-xl text-sm">
                                </div>
                                <div>
                                    <label class="text-xs text-[var(--text-secondary)] block mb-1">经期结束</label>
                                    <input type="text" id="msg-period-end" value="${ps.customMessages?.periodEnd || '经期结束了，可以吃点好的补补 💪'}" 
                                        class="w-full px-3 py-2 border rounded-xl text-sm">
                                </div>
                            </div>
                        </div>

                        <button id="save-period-settings" class="w-full py-2.5 text-white rounded-xl text-sm" style="background:var(--theme)">
                            保存设置
                        </button>
                    </div>
                `;

                document.getElementById('save-period-settings').onclick = async () => {
                    if (!settings.period) settings.period = {};
                    settings.period.reminders = {
                        periodStart: document.getElementById('remind-period-start').checked,
                        periodEnd: document.getElementById('remind-period-end').checked,
                        ovulation: document.getElementById('remind-ovulation').checked,
                        nextPeriod: document.getElementById('remind-next-period').checked,
                        daysBefore: parseInt(document.getElementById('remind-days-before').value) || 2,
                        time: document.getElementById('remind-time').value || '08:00'
                    };
                    settings.period.customMessages = {
                        periodStart: document.getElementById('msg-period-start').value,
                        periodEnd: document.getElementById('msg-period-end').value
                    };
                    await saveSettings();
                    showToast('设置已保存 ✅');
                };
            }

            // 渲染经期日历
            function renderPeriodCalendar() {
                const year = currentCalendarDate.getFullYear();
                const month = currentCalendarDate.getMonth();
                const monthLabel = document.getElementById('period-current-month');
                if (monthLabel) monthLabel.textContent = `${year}年${month + 1}月`;

                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const today = new Date();
                const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

                const calendar = document.getElementById('period-calendar');
                if (!calendar) return;
                calendar.innerHTML = '';

                const predictions = predictPeriods();

                for (let i = 0; i < firstDay; i++) {
                    const empty = document.createElement('div');
                    empty.className = 'mood-calendar-grid-cell';
                    empty.style.visibility = 'hidden';
                    calendar.appendChild(empty);
                }

                for (let day = 1; day <= daysInMonth; day++) {
                    const cell = document.createElement('div');
                    cell.className = 'mood-calendar-grid-cell';
                    const dateStr = formatDateISO(new Date(year, month, day));
                    const record = periodRecords.find(r => r.date === dateStr && r.contactId === currentContactId);
                    const dayType = getPeriodDayType(dateStr, record, predictions);

                    if (dayType === 'period') {
                        cell.classList.add('period-cell-period');
                    } else if (dayType === 'predicted') {
                        cell.classList.add('period-cell-predicted');
                    } else if (dayType === 'ovulation') {
                        cell.classList.add('period-cell-ovulation');
                    } else if (dayType === 'follicular') {
                        cell.classList.add('period-cell-follicular');
                    } else if (dayType === 'luteal') {
                        cell.classList.add('period-cell-luteal');
                    } else if (dayType === 'safe') {
                        cell.classList.add('period-cell-safe');
                    }

                    if (isCurrentMonth && day === today.getDate()) {
                        cell.classList.add('today');
                    }

                    const dayNum = document.createElement('div');
                    dayNum.className = 'cell-day';
                    dayNum.textContent = day;
                    cell.appendChild(dayNum);

                    const markDiv = document.createElement('div');
                    markDiv.className = 'cell-mood';

                    if (record?.isPeriod) {
                        const flow = Math.min(record.flow || 1, 5);
                        markDiv.innerHTML = `<span class="period-icon-dot period">${'🩸'.repeat(flow)}</span>`;
                    } else if (dayType === 'predicted') {
                        markDiv.innerHTML = '<span class="period-icon-dot predicted">🔮</span>';
                    } else if (dayType === 'ovulation') {
                        markDiv.innerHTML = '<span class="period-icon-dot ovulation">🥚</span>';
                    } else if (dayType === 'follicular') {
                        markDiv.innerHTML = '<span class="period-icon-dot follicular">🌱</span>';
                    } else if (dayType === 'luteal') {
                        markDiv.innerHTML = '<span class="period-icon-dot luteal">🌙</span>';
                    } else if (dayType === 'safe') {
                        markDiv.innerHTML = '<span class="period-icon-dot safe">✓</span>';
                    } else {
                        markDiv.innerHTML = '&nbsp;';
                    }

                    if (record?.partnerViewedAt) {
                        var viewedIcon = document.createElement('span');
                        viewedIcon.className = 'text-[10px] ml-0.5';
                        viewedIcon.textContent = '👁';
                        viewedIcon.title = '对方已查看';
                        markDiv.appendChild(viewedIcon);
                    }

                    cell.appendChild(markDiv);
                    cell.dataset.date = dateStr;
                    cell.onclick = () => showPeriodRecordModal(dateStr);

                    calendar.appendChild(cell);
                }

                renderPeriodTodayStatus();
            }

            // 今日快捷状态
            function renderPeriodTodayStatus() {
                const container = document.getElementById('period-today-status');
                if (!container) return;
                const todayStr = formatDateISO(new Date());
                const record = periodRecords.find(r => r.date === todayStr && r.contactId === currentContactId);
                const predictions = predictPeriods();
                const dayType = getPeriodDayType(todayStr, record, predictions);

                let statusText = '';
                let color = '';
                if (record?.isPeriod) {
                    statusText = `经期第${record.periodDay}天 · 流量${['极少','少量','中等','大量','极多'][(record.flow||1)-1]}`;
                    color = '#E8A0BF';
                } else if (dayType === 'predicted') {
                    statusText = '预测经期 · 注意保暖 🌸';
                    color = '#E8A0BF';
                } else if (dayType === 'ovulation') {
                    statusText = '排卵期 · 注意休息 ✨';
                    color = '#FFD54F';
                } else if (dayType === 'safe') {
                    statusText = '安全期 · 状态良好 ☀️';
                    color = '#A5D6A7';
                } else {
                    statusText = '今日无记录';
                    color = 'var(--text-secondary)';
                }

                const ps = settings.period || {};
                const avgCycle = ps.averageCycle || 28;
                const avgPeriod = ps.averagePeriod || 5;
                const lastStart = ps.lastPeriodStart || '--';

                container.innerHTML = `
                    <h4>📅 今日状态</h4>
                    <div class="period-status-row">
                        <span class="period-status-label">状态</span>
                        <span class="period-status-value" style="color:${color};">${statusText}</span>
                    </div>
                    <div class="period-status-row">
                        <span class="period-status-label">平均周期</span>
                        <span class="period-status-value">${avgCycle}天</span>
                    </div>
                    <div class="period-status-row">
                        <span class="period-status-label">平均经期</span>
                        <span class="period-status-value">${avgPeriod}天</span>
                    </div>
                    <div class="period-status-row">
                        <span class="period-status-label">上次经期</span>
                        <span class="period-status-value">${lastStart !== '--' ? lastStart : '--'}</span>
                    </div>
                `;
            }

            // 显示经期记录弹窗
            function showPeriodRecordModal(dateStr) {
                const modal = document.getElementById('period-record-modal');
                if (!modal) return;
                modal.dataset.date = dateStr;

                const title = document.getElementById('period-record-title');
                const dateObj = new Date(dateStr);
                title.textContent = `记录 ${dateObj.getMonth()+1}月${dateObj.getDate()}日`;

                const record = periodRecords.find(r => r.date === dateStr && r.contactId === currentContactId);

                const yesRadio = document.querySelector('input[name="period-yesno"][value="yes"]');
                const noRadio = document.querySelector('input[name="period-yesno"][value="no"]');
                if (record?.isPeriod) {
                    yesRadio.checked = true;
                    document.getElementById('period-day-section').classList.remove('hidden');
                } else if (record?.isPeriod === false) {
                    noRadio.checked = true;
                    document.getElementById('period-day-section').classList.add('hidden');
                } else {
                    yesRadio.checked = true;
                    document.getElementById('period-day-section').classList.remove('hidden');
                }

                document.getElementById('period-day-input').value = record?.periodDay || 1;

                const flowValue = record?.flow || 3;
                document.querySelectorAll('.flow-btn').forEach(btn => {
                    btn.classList.toggle('active', parseInt(btn.dataset.value) === flowValue);
                });

                const painValue = record?.pain || 0;
                document.querySelectorAll('.pain-btn').forEach(btn => {
                    btn.classList.toggle('active', parseInt(btn.dataset.value) === painValue);
                });

                const moodValues = record?.mood || [];
                document.querySelectorAll('.mood-btn').forEach(btn => {
                    btn.classList.toggle('active', moodValues.includes(btn.dataset.mood));
                });

                const medValues = record?.medicine || [];
                document.querySelectorAll('.med-btn').forEach(btn => {
                    btn.classList.toggle('active', medValues.includes(btn.dataset.med));
                });
                document.getElementById('period-med-other').value = '';

                document.getElementById('period-note').value = record?.note || '';

                var delBtn = document.getElementById('delete-period-record');
                var syncBtn = document.getElementById('sync-period-record');
                if (record) { delBtn.classList.remove('hidden');
                    delBtn.dataset.id = record.id;
                    syncBtn.classList.remove('hidden');
                    syncBtn.dataset.date = record.date;
                } else { delBtn.classList.add('hidden');
                    syncBtn.classList.add('hidden'); }

                modal.classList.remove('hidden');
            }

            // 保存经期记录
            async function savePeriodRecord() {
                try {
                const modal = document.getElementById('period-record-modal');
                const dateStr = modal.dataset.date;
                var checkedRadio = document.querySelector('input[name="period-yesno"]:checked');
                if (!checkedRadio) { showToast('请选择是否经期'); return; }
                const isPeriod = checkedRadio.value === 'yes';
                const periodDay = parseInt(document.getElementById('period-day-input').value) || 1;

                const moodBtns = document.querySelectorAll('.mood-btn.active');
                const mood = Array.from(moodBtns).map(btn => btn.dataset.mood);

                const medBtns = document.querySelectorAll('.med-btn.active');
                const medicine = Array.from(medBtns).map(btn => btn.dataset.med);
                const otherMed = document.getElementById('period-med-other').value.trim();
                if (otherMed) medicine.push(otherMed);

                const note = document.getElementById('period-note').value.trim();

                const flowBtn = document.querySelector('.flow-btn.active');
                const painBtn = document.querySelector('.pain-btn.active');
                const flow = flowBtn ? parseInt(flowBtn.dataset.value) : 3;
                const pain = painBtn ? parseInt(painBtn.dataset.value) : 1;

                const existingIndex = periodRecords.findIndex(r => r.date === dateStr && r.contactId === currentContactId);

                const record = {
                    date: dateStr,
                    contactId: currentContactId,
                    isPeriod,
                    periodDay,
                    flow,
                    pain,
                    mood,
                    medicine,
                    note,
                    updatedAt: new Date().toISOString()
                };

                if (existingIndex >= 0) {
                    record.id = periodRecords[existingIndex].id;
                    record.createdAt = periodRecords[existingIndex].createdAt;
                    await updateData('periodRecords', record);
                    periodRecords[existingIndex] = record;
                } else {
                    record.createdAt = record.updatedAt;
                    const id = await addData('periodRecords', record);
                    record.id = id;
                    periodRecords.push(record);
                }

                if (isPeriod) {
                    await recalculatePeriodCycles();
                }

                modal.classList.add('hidden');
                renderPeriodCalendar();
                showToast('记录已保存 ✅');
                } catch (e) { showToast('保存失败：' + e.message); console.error(e); }
            }

            // 重新计算周期
            async function recalculatePeriodCycles() {
                const ps = settings.period || {};
                const periodDays = periodRecords.filter(r => r.isPeriod && r.contactId === currentContactId).sort((a, b) => a.date.localeCompare(b.date));

                if (periodDays.length < 2) {
                    if (periodDays.length === 1) {
                        ps.lastPeriodStart = periodDays[0].date;
                        ps.lastPeriodEnd = periodDays[0].date;
                    }
                    await saveSettings();
                    return;
                }

                const segments = [];
                let currentSeg = [];
                for (let i = 0; i < periodDays.length; i++) {
                    if (currentSeg.length === 0) {
                        currentSeg.push(periodDays[i]);
                    } else {
                        const prevDate = new Date(currentSeg[currentSeg.length - 1].date);
                        const currDate = new Date(periodDays[i].date);
                        const diffDays = Math.floor((currDate - prevDate) / (24 * 60 * 60 * 1000));
                        if (diffDays <= 1) {
                            currentSeg.push(periodDays[i]);
                        } else {
                            segments.push(currentSeg);
                            currentSeg = [periodDays[i]];
                        }
                    }
                }
                if (currentSeg.length > 0) segments.push(currentSeg);

                const cycles = [];
                for (let i = 0; i < segments.length; i++) {
                    const seg = segments[i];
                    const startDate = seg[0].date;
                    const endDate = seg[seg.length - 1].date;
                    const duration = seg.length;
                    let cycleLength = 0;
                    if (i > 0) {
                        const prevEnd = new Date(segments[i - 1][segments[i - 1].length - 1].date);
                        const currStart = new Date(startDate);
                        cycleLength = Math.floor((currStart - prevEnd) / (24 * 60 * 60 * 1000));
                    }
                    cycles.push({ startDate, endDate, duration, cycleLength });
                }

                await clearStore('periodCycles');
                periodCycles = [];
                for (const c of cycles) {
                    const id = await addData('periodCycles', c);
                    c.id = id;
                    periodCycles.push(c);
                }

                if (segments.length > 0) {
                    const lastSeg = segments[segments.length - 1];
                    ps.lastPeriodStart = lastSeg[0].date;
                    ps.lastPeriodEnd = lastSeg[lastSeg.length - 1].date;

                    const validCycles = cycles.filter(c => c.cycleLength > 0);
                    if (validCycles.length > 0) {
                        ps.averageCycle = Math.round(validCycles.reduce((sum, c) => sum + c.cycleLength, 0) / validCycles
                        .length);
                    }
                    const validDurations = cycles.filter(c => c.duration > 0);
                    if (validDurations.length > 0) {
                        ps.averagePeriod = Math.round(validDurations.reduce((sum, c) => sum + c.duration, 0) / validDurations
                            .length);
                    }
                }

                await saveSettings();
            }

            function renderMoments() {
                var bi = document.getElementById('moments-banner-img');
                if (bi && settings.momentsBg) bi.src = settings.momentsBg;
                const container = document.getElementById('moments-list');
                const filter = document.getElementById('moments-filter')?.value || 'all';
                if (!container) return;
                if (!container._filterInit) {
                    container._filterInit = true;
                    const filterSelect = document.getElementById('moments-filter');
                    if (filterSelect && filterSelect.options.length <= 2) {
                        contacts.forEach(c => {
                            if (!filterSelect.querySelector(`option[value="${c.id}"]`)) {
                                const opt = document.createElement('option');
                                opt.value = c.id;
                                opt.textContent = c.name;
                                filterSelect.appendChild(opt);
                            }
                        });
                    }
                }
                let filtered = [...posts];
                if (filter === 'me') filtered = filtered.filter(p => p.authorId === 'me');
                else if (filter && filter !== 'all') filtered = filtered.filter(p => p.authorId === parseInt(filter));
                filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                if (!filtered.length) { container.innerHTML =
                    '<div class="text-center py-8 text-[var(--text-secondary)] text-sm">暂无动态</div>'; return; }
                let html = '';
                filtered.forEach(p => {
                    const author = p.authorId === 'me' ? { name: settings.myName, avatar: settings.myAvatar } : (contacts
                        .find(c => c.id === p.authorId) || { name: '未知', avatar: 'https://picsum.photos/200/200?random=1' });
                    const timeStr = formatDate(p.timestamp) + ' ' + formatTime(p.timestamp);
                    html +=
                        `<div class="mb-4 p-3 bg-[var(--card-bg)] rounded-2xl shadow-sm moment-card"><div class="flex items-center mb-3"><img src="${escapeHtml(author.avatar)}" class="w-10 h-10 rounded-full mr-3" onerror="this.src='https://picsum.photos/200/200?random=1'"><div><p class="font-medium text-sm">${escapeHtml(author.name)}</p><p class="text-xs text-[var(--text-secondary)]">${timeStr}</p></div>${p.authorId === 'me' ? `<button onclick="deletePost(${p.id})" class="ml-auto text-xs text-red-400"><i class="fa fa-trash"></i></button>` : ''}</div><p class="moment-text text-sm mb-2" style="font-size:0.8rem;">${escapeHtml(p.text)}</p>${p.image ? `<img src="${p.image}" class="max-w-full max-h-48 rounded-xl mb-2">` : ''}<div class="flex items-center space-x-4 text-xs text-[var(--text-secondary)] mt-1"><span onclick="showComments(${p.id})" class="cursor-pointer"><i class="fa fa-comment-o mr-1"></i>${(p.comments || []).length}</span></div><div id="comments-${p.id}" class="hidden mt-2 space-y-1"></div><div class="mt-2 flex space-x-1 hidden" id="comment-input-${p.id}"><input type="text" id="comment-text-${p.id}" placeholder="评论..." class="flex-1 px-2 py-1 border border-[var(--border-color)] rounded-lg text-xs"><button onclick="(function(){const inp=document.getElementById('comment-text-${p.id}');const replyTo=inp?inp.dataset.replyTo:null;addComment(${p.id},replyTo?parseInt(replyTo):null);})()" class="px-3 py-1 text-white rounded-lg text-xs" style="background:var(--theme)">发送</button></div></div>`;
                });
                container.innerHTML = html;
            }

            window.showComments = (postId) => {
                const post = posts.find(p => p.id === postId);
                if (!post) return;
                const commentsDiv = document.getElementById(`comments-${postId}`);
                const inputDiv = document.getElementById(`comment-input-${postId}`);
                if (!commentsDiv) return;
                if (commentsDiv.classList.contains('hidden')) {
                    if (!post.comments) post.comments = [];
                    commentsDiv.innerHTML = post.comments.map((c, index) => {
                        const ca = c.authorId === 'me' ? settings.myName : (contacts.find(ct => ct.id === c.authorId)
                            ?.name || '未知');
                        let displayText =
                            `<span class="font-medium">${escapeHtml(ca)}</span>: ${escapeHtml(c.text)}`;
                        if (c.replyToIndex !== undefined && post.comments[c.replyToIndex]) {
                            const targetComment = post.comments[c.replyToIndex];
                            const targetName = targetComment.authorId === 'me' ? settings.myName : (contacts.find(
                                ct => ct.id === targetComment.authorId)?.name || '未知');
                            displayText =
                                `<span class="font-medium">${escapeHtml(ca)}</span> 回复 <span class="font-medium">${escapeHtml(targetName)}</span>: ${escapeHtml(c.text)}`;
                        }
                        return `<div class="text-xs flex justify-between items-center"><div>${displayText} <span class="text-[var(--text-secondary)]">${formatTime(c.timestamp)}</span></div><span class="text-[var(--text-secondary)] cursor-pointer hover:text-[var(--theme)] text-xs" onclick="event.stopPropagation();window.prepareReply(${postId},${index})"><i class="fa fa-reply"></i></span></div>`;
                    }).join('');
                    commentsDiv.classList.remove('hidden');
                    if (inputDiv) inputDiv.classList.remove('hidden');
                } else {
                    commentsDiv.classList.add('hidden');
                    if (inputDiv) inputDiv.classList.add('hidden');
                }
            };

            window.prepareReply = (postId, commentIndex) => {
                const post = posts.find(p => p.id === postId);
                if (!post || !post.comments[commentIndex]) return;
                const targetAuthorId = post.comments[commentIndex].authorId;
                const targetName = targetAuthorId === 'me' ? settings.myName : (contacts.find(c => c.id ===
                    targetAuthorId)?.name || '未知');
                const input = document.getElementById(`comment-text-${postId}`);
                if (input) { input.value = `@${targetName} `;
                    input.focus();
                    input.dataset.replyTo = commentIndex; }
            };

            window.addComment = async (postId, replyToIndex = null) => {
                const input = document.getElementById(`comment-text-${postId}`);
                if (!input) return;
                const text = input.value.trim();
                if (!text) return;
                const post = posts.find(p => p.id === postId);
                if (!post) return;
                if (!post.comments) post.comments = [];
                const comment = { authorId: 'me', text, timestamp: new Date().toISOString() };
                if (replyToIndex !== null && post.comments[replyToIndex]) {
                    comment.replyToIndex = replyToIndex;
                    comment.replyToName = post.comments[replyToIndex].authorId === 'me' ? settings.myName : (contacts
                        .find(c => c.id === post.comments[replyToIndex].authorId)?.name || '未知');
                }
                post.comments.push(comment);
                await updateData('posts', post);
                input.value = '';
                delete input.dataset.replyTo;
                showComments(postId);
                renderMoments();
                if (post.authorId !== 'me') {
                    scheduleAuthorReply(post);
                }
                if (post.authorId === 'me' && replyToIndex !== null) {
                    const targetComment = post.comments[replyToIndex];
                    if (targetComment && targetComment.authorId !== 'me') {
                        scheduleCommentReplyFromAuthor(post, targetComment.authorId);
                    }
                }
            };

            async function scheduleAuthorReply(post) {
                const authorId = post.authorId;
                const pool = buildWordCardPool(authorId);
                if (!pool.length) return;
                var author = contacts.find(function(c) { return c.id === authorId; });
                const minDelay = (author ? getContactReplySetting(author, 'commentReplyMin') : (settings.commentReplyMin || 180)) * 1000;
                const maxDelay = Math.max((author ? getContactReplySetting(author, 'commentReplyMax') : (settings.commentReplyMax || 1800)) * 1000, minDelay);
                const delay = minDelay + Math.random() * (maxDelay - minDelay);
                setTimeout(async () => {
                    const currentPost = posts.find(p => p.id === post.id);
                    if (!currentPost) return;
                    const replyText = pool[Math.floor(Math.random() * pool.length)];
                    if (!currentPost.comments) currentPost.comments = [];
                    const myCommentsIndices = currentPost.comments.map((c, i) => c.authorId === 'me' ? i : -1).filter(
                        i => i !== -1);
                    let replyToIndex = null;
                    if (myCommentsIndices.length > 0) {
                        replyToIndex = myCommentsIndices[myCommentsIndices.length - 1];
                    }
                    const newComment = { authorId, text: replyText, timestamp: new Date().toISOString() };
                    if (replyToIndex !== null) {
                        newComment.replyToIndex = replyToIndex;
                        newComment.replyToName = settings.myName;
                    }
                    currentPost.comments.push(newComment);
                    await updateData('posts', currentPost);
                    if (document.getElementById('moments-panel').classList.contains('open')) renderMoments();
                }, delay);
            }

            async function scheduleCommentReplyFromAuthor(post, targetAuthorId) {
                const pool = buildWordCardPool(targetAuthorId);
                if (!pool.length) return;
                var commentAuthor = contacts.find(function(c) { return c.id === targetAuthorId; });
                const minDelay = (commentAuthor ? getContactReplySetting(commentAuthor, 'commentReplyMin') : (settings.commentReplyMin || 180)) * 1000;
                const maxDelay = Math.max((commentAuthor ? getContactReplySetting(commentAuthor, 'commentReplyMax') : (settings.commentReplyMax || 1800)) * 1000, minDelay);
                const delay = minDelay + Math.random() * (maxDelay - minDelay);
                setTimeout(async () => {
                    const currentPost = posts.find(p => p.id === post.id);
                    if (!currentPost) return;
                    const replyText = pool[Math.floor(Math.random() * pool.length)];
                    if (!currentPost.comments) currentPost.comments = [];
                    const myCommentsIndices = currentPost.comments.map((c, i) => c.authorId === 'me' ? i : -1).filter(
                        i => i !== -1);
                    let replyToIndex = null;
                    if (myCommentsIndices.length > 0) {
                        replyToIndex = myCommentsIndices[myCommentsIndices.length - 1];
                    }
                    const newComment = { authorId: targetAuthorId, text: replyText, timestamp: new Date().toISOString() };
                    if (replyToIndex !== null) {
                        newComment.replyToIndex = replyToIndex;
                        newComment.replyToName = settings.myName;
                    }
                    currentPost.comments.push(newComment);
                    await updateData('posts', currentPost);
                    if (document.getElementById('moments-panel').classList.contains('open')) renderMoments();
                }, delay);
            }

            window.deletePost = async (postId) => {
                if (!confirm('删除这条动态？')) return;
                await deleteData('posts', postId);
                posts = posts.filter(p => p.id !== postId);
                renderMoments();
            };

            async function publishMoment() {
                const text = document.getElementById('moment-text').value.trim();
                const previewImg = document.getElementById('moment-preview-img');
                let imageData = previewImg?.dataset?.compressed || null;
                if (!text && !imageData) { showToast('请输入内容或选择图片'); return; }
                const post = { authorId: 'me', text, image: imageData, likes: [], comments: [], timestamp: new Date()
                        .toISOString() };
                const id = await addData('posts', post);
                post.id = id;
                posts.push(post);
                document.getElementById('moment-text').value = '';
                document.getElementById('moment-image-upload').value = '';
                document.getElementById('moment-image-name').textContent = '';
                document.getElementById('moment-image-preview').classList.add('hidden');
                document.getElementById('clear-moment-image').classList.add('hidden');
                document.getElementById('moment-compose').classList.remove('open');
                renderMoments();
                showToast('发布成功');
                schedulePostCommentsFromContacts(post);
            }

            async function schedulePostCommentsFromContacts(post) {
                const otherContacts = contacts.filter(c => c.id !== 'me' && typeof c.id === 'number');
                if (!otherContacts.length) return;
                let accumulatedDelay = 0;
                for (const commenter of otherContacts) {
                    const cMinDelay = getContactReplySetting(commenter, 'postReplyMin') || (settings.postReplyMin || 300);
                    const cMaxDelay = getContactReplySetting(commenter, 'postReplyMax') || (settings.postReplyMax || 21600);
                    const minDelay = cMinDelay * 1000;
                    const maxDelay = Math.max(cMaxDelay * 1000, minDelay);
                    const delay = minDelay + Math.random() * (maxDelay - minDelay);
                    accumulatedDelay += delay;
                    setTimeout(async () => {
                        const p = posts.find(pp => pp.id === post.id);
                        if (!p) return;
                        const cpool = buildWordCardPool(commenter.id);
                        if (!cpool.length) return;
                        const commentText = cpool[Math.floor(Math.random() * cpool.length)];
                        if (!p.comments) p.comments = [];
                        p.comments.push({ authorId: commenter.id, text: commentText, timestamp: new Date()
                                .toISOString() });
                        await updateData('posts', p);
                        if (document.getElementById('moments-panel').classList.contains('open')) renderMoments();
                    }, accumulatedDelay);
                }
            }

            function startMomentTimers() {
                contacts.forEach(contact => {
                    if (momentTimers[contact.id]) clearTimeout(momentTimers[contact.id]);
                    scheduleNextMoment(contact.id);
                });
            }

            function scheduleNextMoment(contactId) {
                const delay = 1 * 60 * 60 * 1000 + Math.random() * 5 * 60 * 60 * 1000;
                momentTimers[contactId] = setTimeout(async () => {
                    if (Math.random() < 0.4) {
                        const contact = contacts.find(c => c.id === contactId);
                        if (!contact) { scheduleNextMoment(contactId); return; }
                        const pool = buildWordCardPool(contactId);
                        if (pool.length) {
                            let text = pool[Math.floor(Math.random() * pool.length)];
                            const emojiPool = [...getAllEmojiChars(), ...getAllKaomoji()];
                            if (emojiPool.length && Math.random() < 0.3) text = (Math.random() < 0.5 ? emojiPool[Math
                                    .floor(Math.random() * emojiPool.length)] + ' ' : '') + text + (Math.random() <
                                0.5 ? ' ' + emojiPool[Math.floor(Math.random() * emojiPool.length)] : '');
                            const stickerPool = buildStickerPool(contactId);
                            let post = { authorId: contactId, text, image: null, likes: [], comments: [],
                                timestamp: new Date().toISOString() };
                            if (stickerPool.length && Math.random() < 0.2) post.image = stickerPool[Math.floor(Math
                                .random() * stickerPool.length)].src;
                            const id = await addData('posts', post);
                            post.id = id;
                            posts.push(post);
                            if (document.getElementById('moments-panel').classList.contains('open')) renderMoments();
                        }
                    }
                    scheduleNextMoment(contactId);
                }, delay);
            }

            function applyBackgroundEffects() {
                const overlay = document.getElementById('bg-overlay'),
                    sparkles = document.getElementById('bg-sparkles'),
                    bubbles = document.getElementById('bg-bubbles'),
                    hearts = document.getElementById('bg-hearts'),
                    dots = document.getElementById('bg-dots');
                overlay.classList.remove('bg-float');
                sparkles.innerHTML = '';
                bubbles.innerHTML = '';
                hearts.innerHTML = '';
                dots.innerHTML = '';
                if (!settings.bgEffects.enabled) return;
                overlay.classList.add('bg-float');
                for (let i = 0; i < 15; i++) { const s = document.createElement('div');
                    s.className = 'sparkle';
                    s.style.left = Math.random() * 100 + '%';
                    s.style.animationDelay = Math.random() * 8 + 's';
                    s.style.animationDuration = 15 + Math.random() * 15 + 's';
                    s.style.width = 3 + Math.random() * 6 + 'px';
                    s.style.height = s.style.width;
                    sparkles.appendChild(s); }
                for (let i = 0; i < 8; i++) { const b = document.createElement('div');
                    b.className = 'bubble';
                    b.style.left = Math.random() * 100 + '%';
                    b.style.animationDelay = Math.random() * 15 + 's';
                    b.style.animationDuration = 25 + Math.random() * 15 + 's';
                    b.style.width = 4 + Math.random() * 12 + 'px';
                    b.style.height = b.style.width;
                    bubbles.appendChild(b); }
                for (let i = 0; i < 6; i++) { const h = document.createElement('div');
                    h.className = 'heart';
                    h.textContent = '♥';
                    h.style.left = Math.random() * 100 + '%';
                    h.style.animationDelay = Math.random() * 15 + 's';
                    h.style.animationDuration = 20 + Math.random() * 15 + 's';
                    h.style.fontSize = 8 + Math.random() * 14 + 'px';
                    hearts.appendChild(h); }
                for (let i = 0; i < 20; i++) { const d = document.createElement('div');
                    d.className = 'dot';
                    d.style.left = Math.random() * 100 + '%';
                    d.style.animationDelay = Math.random() * 8 + 's';
                    d.style.animationDuration = 20 + Math.random() * 15 + 's';
                    d.style.width = 2 + Math.random() * 5 + 'px';
                    d.style.height = d.style.width;
                    dots.appendChild(d); }
            }

            function applySkin() {
                const r = document.documentElement;
                r.style.setProperty('--theme', settings.themeColor);
                r.style.setProperty('--theme-light', settings.themeColor + '20');
                r.style.setProperty('--bubble-me', settings.bubbleMeColor);
                r.style.setProperty('--bubble-you', settings.bubbleYouColor);
                r.style.setProperty('--radius', settings.borderRadius + 'px');
                r.style.setProperty('--bg-image', settings.bgImage ? `url(${settings.bgImage})` : 'none');
                r.style.setProperty('--bg-blur', settings.bgBlur + 'px');
                r.style.setProperty('--bg-opacity', settings.bgOpacity);
                settings.darkMode ? document.body.classList.add('dark-mode') : document.body.classList.remove('dark-mode');
                document.getElementById('darkmode-icon').className = settings.darkMode ? 'fa fa-sun-o text-lg' :
                    'fa fa-moon-o text-lg';
                applyBackgroundEffects();
                applyAvatarEffects();
                applyCustomCSS();
            }

            function applyCustomCSS() {
                var existing = document.getElementById('custom-user-css');
                if (!existing) {
                    existing = document.createElement('style');
                    existing.id = 'custom-user-css';
                    document.head.appendChild(existing);
                }
                existing.textContent = settings.customCSS || '';
            }

            function updateChatBackground() {
                let img = '';
                if (currentChatType === 'private') { const c = getCurrentContact(); if (c?.bgImage) img = c.bgImage; } else if (
                    currentChatType === 'group') { const g = getCurrentGroup(); if (g?.bgImage) img = g.bgImage; }
                document.getElementById('bg-overlay').style.backgroundImage = img ? `url(${img})` : (settings.bgImage ?
                    `url(${settings.bgImage})` : '');
            }

            async function saveSettings() {
                settings.emojiChars = emojiChars;
                settings.kaomojiChars = kaomojiChars;
                await updateData('settings', { key: 'main', value: settings });
            }

            function formatCallDuration(sec) {
                if (isNaN(sec) || sec < 0) return '00:00';
                const h = Math.floor(sec / 3600),
                    m = Math.floor((sec % 3600) / 60),
                    s = sec % 60;
                return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` :
                    `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }

            function startGroupCallDuration() {
                if (groupCallState.durationInterval) clearInterval(groupCallState.durationInterval);
                groupCallState.durationInterval = setInterval(() => {
                    if (!groupCallState.startTime) return;
                    const d = Math.floor((Date.now() - groupCallState.startTime) / 1000);
                    document.getElementById('group-call-duration').textContent = formatCallDuration(d);
                    document.getElementById('group-float-duration').textContent = formatCallDuration(d);
                    var gpDur = document.getElementById('group-pip-duration');
                    if (gpDur) gpDur.textContent = formatCallDuration(d);
                }, 1000);
            }

            function startGroupCall() {
                const group = getCurrentGroup();
                if (!group || groupCallState.status !== 'idle') return;
                const participants = group.members.filter(mid => mid !== 'me');
                if (!participants.length) { showToast('群聊中没有其他成员'); return; }
                groupCallState = {
                    status: 'calling',
                    initiator: 'me',
                    groupId: currentGroupId,
                    startTime: null,
                    muted: false,
                    minimized: false,
                    displayMode: 'full',
                    durationInterval: null,
                    participants: [...participants],
                    memberStates: {},
                    memberTimers: {},
                    memberDurations: {},
                    rejoinTimers: {},
                    memberJoinTimes: {},
                    memberTimeoutTimers: {}
                };
                participants.forEach(mid => { groupCallState.memberStates[mid] = 'inviting'; });
                document.getElementById('group-call-interface').classList.remove('hidden');
                document.getElementById('group-call-pip-window').classList.add('hidden');
                document.getElementById('group-call-float-window').classList.add('hidden');
                document.getElementById('group-call-waiting').classList.remove('hidden');
                document.getElementById('group-call-active').classList.add('hidden');
                document.getElementById('group-call-result').classList.add('hidden');
                renderGroupCallMembers();
                startGroupCallDuration();
                participants.forEach(mid => startMemberDecision(mid));
            }

            function startMemberDecision(memberId) {
                if (groupCallState.status !== 'calling' && groupCallState.status !== 'connected') return;
                const delay = 3000 + Math.random() * 27000;
                const timerId = setTimeout(() => {
                    if (groupCallState.status !== 'calling' && groupCallState.status !== 'connected') return;
                    var member = contacts.find(function(c) { return c.id === memberId; });
                    var acceptChance = member ? getContactReplySetting(member, 'groupCallAcceptChance') : settings.groupCallAcceptChance;
                    var rejectChance = member ? getContactReplySetting(member, 'groupCallRejectChance') : settings.groupCallRejectChance;
                    const roll = Math.random();
                    if (roll < acceptChance) { memberJoinGroupCall(memberId); } else if (roll < acceptChance + rejectChance) { groupCallState.memberStates[
                            memberId] = 'rejected';
                        addCallRecordForMember(memberId, 'rejected');
                        startRejoinCheck(memberId); } else { groupCallState.memberStates[memberId] = 'timeout';
                        addCallRecordForMember(memberId, 'timeout');
                        startRejoinCheck(memberId); }
                    renderGroupCallMembers();
                    renderGroupCallActiveMembers();
                }, delay);
                groupCallState.memberTimers[memberId] = timerId;
                const timeoutTimer = setTimeout(() => {
                    if (groupCallState.memberStates[memberId] === 'inviting') { groupCallState.memberStates[
                            memberId] = 'timeout';
                        addCallRecordForMember(memberId, 'timeout');
                        startRejoinCheck(memberId);
                        renderGroupCallMembers();
                        renderGroupCallActiveMembers(); }
                }, 30000);
                groupCallState.memberTimeoutTimers[memberId] = timeoutTimer;
            }

            function memberJoinGroupCall(memberId) {
                if (groupCallState.memberStates[memberId] === 'connected') return;
                if (groupCallState.memberTimeoutTimers[memberId]) clearTimeout(groupCallState.memberTimeoutTimers[
                memberId]);
                if (groupCallState.memberTimers[memberId]) clearTimeout(groupCallState.memberTimers[memberId]);
                groupCallState.memberStates[memberId] = 'connected';
                groupCallState.memberJoinTimes[memberId] = Date.now();
                if (!groupCallState.startTime) groupCallState.startTime = Date.now();
                if (groupCallState.status === 'calling') {
                    groupCallState.status = 'connected';
                    document.getElementById('group-call-waiting').classList.add('hidden');
                    document.getElementById('group-call-active').classList.remove('hidden');
                }
                scheduleMemberHangup(memberId);
                const member = contacts.find(c => c.id === memberId);
                const memberName = member?.name || '未知成员';
                const joinMsg = { type: 'call', text: `${memberName} 加入了群通话`, senderId: 'me', groupId: groupCallState
                        .groupId, timestamp: new Date().toISOString(), read: true };
                addData('groupMessages', joinMsg).then(id => { joinMsg.id = id;
                    groupMessages.push(joinMsg);
                    messages = groupMessages; if (currentChatType === 'group' && currentGroupId === groupCallState
                        .groupId) { appendMessageToChat(joinMsg);
                        scrollToBottom(); } });
                renderGroupCallActiveMembers();
                renderGroupFloatAvatars();
            }

            function scheduleMemberHangup(memberId) {
                if (groupCallState.memberStates[memberId] !== 'connected') return;
                var member = contacts.find(function(c) { return c.id === memberId; });
                var hangupMin = member ? getContactReplySetting(member, 'callHangupMin') : settings.callHangupMin;
                var hangupMax = member ? getContactReplySetting(member, 'callHangupMax') : settings.callHangupMax;
                const minMs = hangupMin * 60000;
                const maxMs = Math.max(hangupMax * 60000, minMs);
                const delay = minMs + Math.random() * (maxMs - minMs);
                const timerId = setTimeout(() => {
                    if (groupCallState.memberStates[memberId] !== 'connected') return;
                    if (Math.random() < 0.6) { removeMemberFromGroupCall(memberId, 'hangup'); } else { scheduleMemberHangup(
                            memberId); }
                }, delay);
                groupCallState.memberTimers[memberId] = timerId;
            }

            function removeMemberFromGroupCall(memberId, reason) {
                groupCallState.memberStates[memberId] = reason || 'hangup';
                if (groupCallState.memberJoinTimes[memberId]) {
                    const dur = Math.floor((Date.now() - groupCallState.memberJoinTimes[memberId]) / 1000);
                    groupCallState.memberDurations[memberId] = dur;
                }
                if (groupCallState.memberTimers[memberId]) { clearTimeout(groupCallState.memberTimers[memberId]);
                    delete groupCallState.memberTimers[memberId]; }
                if (groupCallState.memberTimeoutTimers[memberId]) { clearTimeout(groupCallState.memberTimeoutTimers[
                        memberId]);
                    delete groupCallState.memberTimeoutTimers[memberId]; }
                addCallRecordForMember(memberId, reason || 'hangup');
                startRejoinCheck(memberId);
                const anyConnected = Object.values(groupCallState.memberStates).some(s => s === 'connected');
                if (!anyConnected) { endGroupCall('all-left'); } else { renderGroupCallActiveMembers();
                    renderGroupFloatAvatars(); }
            }

            function renderGroupPipAvatars() {
                var container = document.getElementById('group-pip-avatars');
                if (!container) return;
                container.innerHTML = '';
                var group = getCurrentGroup();
                if (!group) return;
                var shown = groupCallState.participants.filter(mid => groupCallState.memberStates[mid] === 'connected').slice(0, 5);
                shown.forEach(mid => {
                    var c = contacts.find(x => x.id === mid);
                    var img = document.createElement('img');
                    img.src = c?.avatar || 'https://picsum.photos/40/40?random=' + mid;
                    img.className = 'w-8 h-8 rounded-full border-2 border-white/40';
                    container.appendChild(img);
                });
                document.getElementById('group-pip-name').textContent = group.name || '群视频通话';
            }
            function endGroupCall(reason) {
                var now = Date.now();
                clearInterval(groupCallState.durationInterval);
                Object.values(groupCallState.memberTimers).forEach(t => clearTimeout(t));
                Object.values(groupCallState.rejoinTimers).forEach(t => clearInterval(t));
                Object.values(groupCallState.memberTimeoutTimers).forEach(t => clearTimeout(t));
                groupCallState.memberTimers = {};
                groupCallState.rejoinTimers = {};
                groupCallState.memberTimeoutTimers = {};
                // finalize durations for still-connected members
                groupCallState.participants.forEach(mid => {
                    if (groupCallState.memberStates[mid] === 'connected' && groupCallState.memberJoinTimes[mid]) {
                        groupCallState.memberDurations[mid] = Math.floor((now - groupCallState.memberJoinTimes[mid]) / 1000);
                    }
                });
                const totalDuration = groupCallState.startTime ? Math.floor((Date.now() - groupCallState.startTime) / 1000) :
                    0;
                let endText = '';
                if (reason === 'cancel') { endText = `${settings.myName} 结束了群通话`; } else if (reason === 'reject') { endText =
                        '群通话被拒绝'; } else { endText = `群通话已结束，总时长 ${formatCallDuration(totalDuration)}`; }
                // Build detail text with individual durations
                var detailParts = [];
                groupCallState.participants.forEach(function(mid) {
                    if (groupCallState.memberDurations[mid] !== undefined) {
                        var c = contacts.find(function(x) { return x.id === mid; });
                        detailParts.push((c?.name || mid) + ': ' + formatCallDuration(groupCallState.memberDurations[mid]));
                    }
                });
                if (detailParts.length) endText += '\n' + detailParts.join(' | ');
                const endMsg = { type: 'call', text: endText, senderId: 'me', groupId: groupCallState.groupId, timestamp: new Date()
                        .toISOString(), read: true };
                addData('groupMessages', endMsg).then(id => { endMsg.id = id;
                    groupMessages.push(endMsg);
                    messages = groupMessages; if (currentChatType === 'group' && currentGroupId === groupCallState
                        .groupId) { appendMessageToChat(endMsg);
                        scrollToBottom(); } });
                groupCallState.status = 'ended';
                document.getElementById('group-call-waiting').classList.add('hidden');
                document.getElementById('group-call-active').classList.add('hidden');
                document.getElementById('group-call-result').classList.remove('hidden');
                let txt = '';
                if (reason === 'cancel') txt = '群通话已取消';
                else if (reason === 'reject') txt = '群通话被拒绝';
                else txt = '群通话已结束';
                document.getElementById('group-call-total-duration').textContent = '通话时长 ' + formatCallDuration(totalDuration);
                // render my duration and other members
                var myDur = document.getElementById('my-duration-value');
                if (myDur) myDur.textContent = formatCallDuration(totalDuration);
                var otherContainer = document.getElementById('group-call-other-durations');
                otherContainer.innerHTML = '';
                var group = getCurrentGroup();
                if (group && reason !== 'reject') {
                    var allMembers = groupCallState.participants.filter(mid => groupCallState.memberDurations[mid] !== undefined || groupCallState.memberStates[mid] === 'connected');
                    allMembers.sort((a, b) => (groupCallState.memberDurations[b] || 0) - (groupCallState.memberDurations[a] || 0));
                    allMembers.forEach(mid => {
                        var c = contacts.find(x => x.id === mid);
                        var dur = groupCallState.memberDurations[mid] || 0;
                        var row = document.createElement('div');
                        row.className = 'flex items-center gap-3 px-3 py-2 rounded-lg';
                        row.style.background = 'var(--theme-light, rgba(99,102,241,0.08))';
                        row.style.border = '1px solid var(--border-color)';
                        row.innerHTML = '<img src="' + (c?.avatar || 'https://picsum.photos/24/24?random=' + mid) + '" class="w-7 h-7 rounded-full flex-shrink-0 border" style="border-color:var(--border-color);"><span class="flex-1 truncate" style="color:var(--text-primary);font-size:0.8125rem;">' + (c?.name || mid) + '</span><span class="font-mono" style="color:var(--text-secondary);font-size:0.75rem;">' + formatCallDuration(dur) + '</span>';
                        otherContainer.appendChild(row);
                    });
                }
                // toggle details
                var toggleBtn = document.getElementById('group-call-toggle-details');
                if (toggleBtn) {
                    toggleBtn.onclick = function() {
                        var oc = document.getElementById('group-call-other-durations');
                        var isHidden = oc.classList.contains('hidden');
                        oc.classList.toggle('hidden');
                        toggleBtn.textContent = isHidden ? '▲ 收起详情' : '▼ 查看成员详情';
                    };
                }
                document.getElementById('group-call-float-window').classList.add('hidden');
                document.getElementById('group-call-pip-window').classList.add('hidden');
                setTimeout(() => { document.getElementById('group-call-interface').classList.add('hidden');
                    groupCallState.status = 'idle'; }, 5000);
            }

            function startRejoinCheck(memberId) {
                if (groupCallState.rejoinTimers[memberId]) clearInterval(groupCallState.rejoinTimers[memberId]);
                const checkInterval = 30 * 60 * 1000 + Math.random() * 90 * 60 * 1000;
                const timerId = setInterval(() => {
                    if (groupCallState.status !== 'calling' && groupCallState.status !== 'connected') { clearInterval(
                            groupCallState.rejoinTimers[memberId]);
                        delete groupCallState.rejoinTimers[memberId]; return; }
                    if (groupCallState.memberStates[memberId] === 'connected') return;
                    if (Math.random() < 0.3) { memberJoinGroupCall(memberId);
                        clearInterval(groupCallState.rejoinTimers[memberId]);
                        delete groupCallState.rejoinTimers[memberId]; }
                }, checkInterval);
                groupCallState.rejoinTimers[memberId] = timerId;
            }

            function renderGroupCallMembers() {
                const container = document.getElementById('group-call-member-list');
                const group = groups.find(g => g.id === groupCallState.groupId);
                if (!container || !group) return;
                container.innerHTML = '';
                group.members.forEach(mid => {
                    const c = contacts.find(cc => cc.id === mid);
                    if (c) {
                        const state = groupCallState.memberStates[mid];
                        let opacity = '';
                        if (state === 'rejected' || state === 'timeout' || state === 'hangup') opacity =
                            'style="opacity:0.5"';
                        container.innerHTML +=
                            `<div class="text-center" ${opacity}><img src="${escapeHtml(c.avatar)}" class="w-16 h-16 rounded-full border-4 mx-auto" style="border-color:#fff;" onerror="this.src='https://picsum.photos/200/200?random=1'"><p class="text-sm mt-1" style="color:#fff;">${escapeHtml(c.name)}</p></div>`;
                    }
                });
            }

            function renderGroupCallActiveMembers() {
                const container = document.getElementById('group-call-active-members');
                if (!container) return;
                container.innerHTML = '';
                const group = groups.find(g => g.id === groupCallState.groupId);
                if (!group) return;
                group.members.forEach(mid => {
                    const c = contacts.find(cc => cc.id === mid);
                    if (!c) return;
                    const state = groupCallState.memberStates[mid] || 'unknown';
                    if (state !== 'connected') return;
                    container.innerHTML +=
                        `<div class="text-center"><img src="${escapeHtml(c.avatar)}" class="w-20 h-20 rounded-full border-4 mx-auto" style="border-color:#4caf50;" onerror="this.src='https://picsum.photos/200/200?random=1'"><p class="text-sm mt-1" style="color:var(--text-primary);">${escapeHtml(c.name)}</p></div>`;
                });
            }

            function renderGroupFloatAvatars() {
                const span = document.getElementById('group-float-avatars'); if (!span) return;
                span.innerHTML = '';
                const connectedMembers = Object.keys(groupCallState.memberStates).filter(mid => groupCallState.memberStates[
                    mid] === 'connected');
                connectedMembers.slice(0, 2).forEach(mid => {
                    const c = contacts.find(cc => cc.id === parseInt(mid));
                    if (c) span.innerHTML +=
                        `<img src="${escapeHtml(c.avatar)}" class="w-6 h-6 rounded-full border" onerror="this.src='https://picsum.photos/200/200?random=1'">`;
                });
                if (connectedMembers.length > 2) span.innerHTML +=
                    `<span class="w-6 h-6 rounded-full bg-gray-300 text-xs flex items-center justify-center">+${connectedMembers.length - 2}</span>`;
            }

            async function addCallRecordForMember(memberId, reason) {
                const member = contacts.find(c => c.id === memberId);
                const memberName = member?.name || '未知成员';
                let text = '';
                const dur = groupCallState.memberDurations[memberId] || 0;
                if (reason === 'rejected') text = `${memberName} 拒绝了群通话`;
                else if (reason === 'timeout') text = `${memberName} 未接听群通话`;
                else if (reason === 'hangup') text = `${memberName} 离开了群通话，通话时长 ${formatCallDuration(dur)}`;
                if (!text) return;
                const msg = { type: 'call', text, senderId: 'me', groupId: groupCallState.groupId, timestamp: new Date()
                        .toISOString(), read: true };
                const id = await addData('groupMessages', msg);
                msg.id = id;
                groupMessages.push(msg);
                messages = groupMessages;
                if (currentChatType === 'group' && currentGroupId === groupCallState.groupId) { appendMessageToChat(msg);
                    scrollToBottom(); }
            }

            function startCall() {
                const contact = getCurrentContact();
                if (!contact || callState.status !== 'idle') { hangupCall(); return; }
                clearTimeout(callTimer);
                clearTimeout(callState.hangupTimer);
                callState = { status: 'calling', initiator: 'me', contactId: currentContactId, muted: false, minimized: false,
                    displayMode: 'full', speakerOn: true, cameraOn: true, startTime: null, durationInterval: null, hangupTimer: null };
                document.getElementById('call-partner-avatar').src = contact.avatar;
                document.getElementById('call-partner-name').textContent = contact.name;
                var nameEl = document.getElementById('call-partner-name-active');
                if (nameEl) nameEl.textContent = contact.name;
                document.getElementById('call-interface').classList.remove('hidden');
                document.getElementById('call-waiting').classList.remove('hidden');
                document.getElementById('call-active').classList.add('hidden');
                document.getElementById('call-result').classList.add('hidden');
                document.getElementById('call-float-window').classList.add('hidden');
                document.getElementById('call-pip-window').classList.add('hidden');
                callTimer = setTimeout(() => endCall('missed'), 30000);
                setTimeout(() => { if (callState.status === 'calling') { const r = Math.random(); if (r < settings
                            .callAcceptChance) acceptCall();
                        else endCall('reject'); } }, 2500 + Math.random() * 4000);
            }

            function acceptCall() {
                clearTimeout(callTimer);
                const contact = contacts.find(c => c.id === callState.contactId) || getCurrentContact();
                callState.status = 'connected';
                callState.displayMode = 'full';
                callState.minimized = false;
                callState.startTime = Date.now();
                document.getElementById('call-waiting').classList.add('hidden');
                document.getElementById('call-active').classList.remove('hidden');
                document.getElementById('call-pip-window').classList.add('hidden');
                document.getElementById('call-float-window').classList.add('hidden');
                var avatarUrl = contact?.avatar || 'https://picsum.photos/200/200?random=1';
                document.getElementById('call-active-avatar').src = avatarUrl;
                var nameEl = document.getElementById('call-partner-name-active');
                if (nameEl) nameEl.textContent = contact?.name || '';
                resetCallUI();
                startPrivateCallDuration();
                schedulePartnerHangup();
            }

            function schedulePartnerHangup() {
                if (callState.status !== 'connected') return;
                var c = getCurrentContact();
                var hangupMin = c ? getContactReplySetting(c, 'callHangupMin') : settings.callHangupMin;
                var hangupMax = c ? getContactReplySetting(c, 'callHangupMax') : settings.callHangupMax;
                const min = hangupMin * 60000,
                    max = Math.max(hangupMax * 60000, min);
                callState.hangupTimer = setTimeout(() => { if (callState.status === 'connected') { if (Math.random() < 0.6)
                            endCall('partner-hangup');
                        else schedulePartnerHangup(); } }, min + Math.random() * (max - min));
            }

            function startPrivateCallDuration() {
                if (callState.durationInterval) clearInterval(callState.durationInterval);
                callState.durationInterval = setInterval(() => {
                    const d = Math.floor((Date.now() - callState.startTime) / 1000);
                    document.getElementById('call-duration').textContent = formatCallDuration(d);
                    document.getElementById('float-duration').textContent = formatCallDuration(d);
                    var pipDur = document.getElementById('pip-duration');
                    if (pipDur) pipDur.textContent = formatCallDuration(d);
                }, 1000);
            }

            function endCall(reason) {
                clearTimeout(callTimer);
                clearTimeout(callState.hangupTimer);
                clearInterval(callState.durationInterval);
                const contact = contacts.find(c => c.id === callState.contactId) || getCurrentContact();
                const dur = callState.startTime ? Math.floor((Date.now() - callState.startTime) / 1000) : 0;
                callState.status = 'ended';
                document.getElementById('call-waiting').classList.add('hidden');
                document.getElementById('call-active').classList.add('hidden');
                document.getElementById('call-result').classList.remove('hidden');
                let txt = '';
                if (reason === 'reject') txt = '对方拒绝';
                else if (reason === 'partner-hangup') txt = `${contact?.name || 'TA'}挂断`;
                else if (reason === 'cancel') txt = `${settings.myName}挂断`;
                else if (reason === 'missed') txt = `${contact?.name || 'TA'}未及时接听`;
                document.getElementById('call-result-text').textContent = txt;
                document.getElementById('call-duration-result').textContent = (reason === 'reject' || reason === 'missed') ?
                    '' : `时长${formatCallDuration(dur)}`;
                document.getElementById('call-float-window').classList.add('hidden');
                document.getElementById('call-pip-window').classList.add('hidden');
                addCallRecord(dur, txt);
                setTimeout(() => { document.getElementById('call-interface').classList.add('hidden');
                    callState.status = 'idle'; }, 1500);
            }

            async function addCallRecord(dur, text) {
                const contactId = callState.contactId || currentContactId;
                const contact = contacts.find(c => c.id === contactId);
                if (!contact) return;
                const msg = { type: 'call', text: text.includes('未及时接听') ? text : (text.includes('拒绝') ? text :
                        `${text}，通话时长 ${formatCallDuration(dur)}`), isMe: callState.initiator === 'me', timestamp: new Date()
                        .toISOString(), read: true, contactId: contactId };
                const id = await addData('messages', msg);
                msg.id = id;
                messages.push(msg);
                if (currentChatType === 'private' && currentContactId === contactId) { appendMessageToChat(msg);
                    scrollToBottom(); }
            }

            function minimizeCall() {
                if (callState.status !== 'connected') return;
                const contact = contacts.find(c => c.id === callState.contactId) || getCurrentContact();
                var ci = document.getElementById('call-interface'), cp = document.getElementById('call-pip-window'), cf = document.getElementById('call-float-window');
                if (callState.displayMode === 'full') {
                    // full → pip
                    callState.displayMode = 'pip';
                    callState.minimized = true;
                    ci.classList.add('hidden');
                    cf.classList.add('hidden');
                    cp.classList.remove('hidden');
                    document.getElementById('pip-avatar').src = contact?.avatar || 'https://picsum.photos/200/200?random=1';
                    document.getElementById('pip-name').textContent = contact?.name || '';
                } else if (callState.displayMode === 'pip') {
                    // pip → bar
                    callState.displayMode = 'bar';
                    cp.classList.add('hidden');
                    cf.classList.remove('hidden');
                    document.getElementById('float-avatar').src = contact?.avatar || 'https://picsum.photos/200/200?random=1';
                }
            }

            function restoreCall() {
                const contact = contacts.find(c => c.id === callState.contactId) || getCurrentContact();
                var ci = document.getElementById('call-interface'), cp = document.getElementById('call-pip-window'), cf = document.getElementById('call-float-window');
                if (callState.displayMode === 'bar') {
                    // bar → pip
                    callState.displayMode = 'pip';
                    cf.classList.add('hidden');
                    cp.classList.remove('hidden');
                    document.getElementById('pip-avatar').src = contact?.avatar || 'https://picsum.photos/200/200?random=1';
                    document.getElementById('pip-name').textContent = contact?.name || '';
                } else if (callState.displayMode === 'pip') {
                    // pip → full
                    callState.displayMode = 'full';
                    cp.classList.add('hidden');
                    ci.classList.remove('hidden');
                    callState.minimized = false;
                }
            }

            function hangupCall() {
                if (callState.status === 'connected') endCall('cancel');
                else if (callState.status === 'calling') { clearTimeout(callTimer);
                    endCall('cancel'); }
                document.getElementById('call-interface').classList.add('hidden');
                document.getElementById('call-float-window').classList.add('hidden');
                document.getElementById('call-pip-window').classList.add('hidden');
                callState.status = 'idle';
            }

            function incomingCall() {
                const contact = getCurrentContact();
                if (callState.status !== 'idle' || !contact) return;
                document.getElementById('incoming-call-avatar').src = contact.avatar;
                document.getElementById('incoming-call-title').textContent = `${contact.name} 邀请你视频通话`;
                document.getElementById('incoming-call-panel').classList.remove('hidden');
                callState.status = 'incoming';
                callState.initiator = 'partner';
                callState.contactId = contact.id;
                autoHangup = setTimeout(() => { if (callState.status === 'incoming') { document.getElementById(
                            'incoming-call-panel').classList.add('hidden');
                        callState.status = 'idle';
                        addCallRecord(0, `${settings.myName}未及时接听`); } }, 60000);
            }

            function incomingCallFromContact(contactId) {
                const contact = contacts.find(c => c.id === contactId);
                if (!contact || callState.status !== 'idle') return;
                document.getElementById('incoming-call-avatar').src = contact.avatar;
                document.getElementById('incoming-call-title').textContent = `${contact.name} 邀请你视频通话`;
                document.getElementById('incoming-call-panel').classList.remove('hidden');
                callState.status = 'incoming';
                callState.initiator = 'partner';
                callState.contactId = contactId;
                autoHangup = setTimeout(() => { if (callState.status === 'incoming') { document.getElementById(
                            'incoming-call-panel').classList.add('hidden');
                        callState.status = 'idle';
                        addCallRecord(0, `${settings.myName}未及时接听`); } }, 60000);
            }

            function acceptIncomingCall() {
                clearTimeout(autoHangup);
                const contact = contacts.find(c => c.id === callState.contactId) || getCurrentContact();
                document.getElementById('incoming-call-panel').classList.add('hidden');
                callState.status = 'connected';
                callState.displayMode = 'full';
                callState.minimized = false;
                callState.startTime = Date.now();
                callState.initiator = 'partner';
                document.getElementById('call-pip-window').classList.add('hidden');
                document.getElementById('call-float-window').classList.add('hidden');
                var avatarUrl = contact?.avatar || 'https://picsum.photos/200/200?random=1';
                document.getElementById('call-active-avatar').src = avatarUrl;
                var nameEl = document.getElementById('call-partner-name-active');
                if (nameEl) nameEl.textContent = contact?.name || '';
                document.getElementById('call-interface').classList.remove('hidden');
                document.getElementById('call-active').classList.remove('hidden');
                document.getElementById('call-waiting').classList.add('hidden');
                document.getElementById('call-result').classList.add('hidden');
                resetCallUI();
                startPrivateCallDuration();
                schedulePartnerHangup();
            }

            function incomingGroupCallFromMember(groupId, initiatorId) {
                if (groupCallState.status !== 'idle') return;
                const group = groups.find(g => g.id === groupId);
                if (!group) return;
                const initiator = contacts.find(c => c.id === initiatorId);
                document.getElementById('incoming-group-call-avatar').src = initiator?.avatar ||
                    'https://picsum.photos/200/200?random=1';
                document.getElementById('incoming-group-call-title').textContent =
                `${initiator?.name || '成员'} 邀请你群视频通话`;
                document.getElementById('incoming-group-call-panel').classList.remove('hidden');
                groupCallState.status = 'incoming';
                groupCallState.groupId = groupId;
                groupCallState.participants = group.members.filter(mid => mid !== 'me');
                groupCallState.memberStates = {};
                groupCallState.participants.forEach(mid => { groupCallState.memberStates[mid] = 'inviting'; });
                autoHangup = setTimeout(() => {
                    if (groupCallState.status === 'incoming') {
                        document.getElementById('incoming-group-call-panel').classList.add('hidden');
                        const endMsg = { type: 'call', text: `${settings.myName} 未接听群通话`, senderId: 'me',
                            groupId: groupId, timestamp: new Date().toISOString(), read: true };
                        addData('groupMessages', endMsg).then(id => { endMsg.id = id;
                            groupMessages.push(endMsg);
                            messages = groupMessages; if (currentChatType === 'group' && currentGroupId ===
                                groupId) { appendMessageToChat(endMsg);
                                scrollToBottom(); } });
                        groupCallState.status = 'idle';
                    }
                }, 60000);
            }

            function acceptGroupCall() {
                clearTimeout(autoHangup);
                document.getElementById('incoming-group-call-panel').classList.add('hidden');
                groupCallState.status = 'connected';
                groupCallState.displayMode = 'full';
                groupCallState.minimized = false;
                groupCallState.startTime = Date.now();
                document.getElementById('group-call-interface').classList.remove('hidden');
                document.getElementById('group-call-waiting').classList.add('hidden');
                document.getElementById('group-call-active').classList.remove('hidden');
                document.getElementById('group-call-pip-window').classList.add('hidden');
                document.getElementById('group-call-float-window').classList.add('hidden');
                renderGroupCallActiveMembers();
                startGroupCallDuration();
                groupCallState.participants.forEach(mid => startMemberDecision(mid));
            }

            function startChatInviteTimer() {
                if (chatInviteTimer) clearTimeout(chatInviteTimer);
                const schedule = () => { const delay = 30 * 60 * 1000 + Math.random() * 2.5 * 60 * 60 * 1000;
                    chatInviteTimer = setTimeout(() => { triggerChatInvite();
                        schedule(); }, delay); };
                schedule();
            }

            function triggerChatInvite() {
                if (contacts.length < 2) return;
                const available = contacts.filter(c => c.id !== currentContactId);
                if (!available.length) return;
                const target = available[Math.floor(Math.random() * available.length)];
                showChatInvite(target);
            }

            function showChatInvite(contact) {
                document.getElementById('incoming-chat-avatar').src = contact.avatar;
                document.getElementById('incoming-chat-title').textContent = `${contact.name} 邀请你私聊`;
                document.getElementById('incoming-chat-panel').classList.remove('hidden');
                document.getElementById('incoming-chat-panel').dataset.contactId = contact.id;
            }

            function acceptChatInvite() {
                const contactId = parseInt(document.getElementById('incoming-chat-panel').dataset.contactId);
                document.getElementById('incoming-chat-panel').classList.add('hidden');
                if (contactId) switchContact(contactId);
            }

            function startStatusTimersForAll() {
                Object.values(allStatusTimers).forEach(t => clearTimeout(t));
                allStatusTimers = {};
                contacts.forEach(contact => {
                    var sLib = contact.replySettings ? (getContactReplySetting(contact, 'statusLibrary') || []) : (settings.statusLibrary || []);
                    if (!sLib.length) return;
                    const schedule = () => { const min = (getContactReplySetting(contact, 'statusMin') || 5) * 60000; const max = Math.max((
                            (getContactReplySetting(contact, 'statusMax') || 60) * 60000), min); const timerId = setTimeout(async () => { if (!
                                sLib.length) { schedule(); return; } const s = sLib[Math.floor(Math.random() * sLib.length)];
                            contact.status = s;
                            await updateContact(contact); if (currentChatType === 'private' && contact.id ===
                                currentContactId) document.getElementById('partner-status').textContent = s;
                            renderContactList();
                            schedule(); }, min + Math.random() * (max - min));
                        allStatusTimers[contact.id] = timerId; };
                    schedule();
                });
            }

            function startActiveMsgTimer() {
                if (activeMsgTimer) clearTimeout(activeMsgTimer);
                var c = getCurrentContact();
                if (c && !getContactReplySetting(c, 'activeMsgEnabled')) return;
                if (!c && !settings.activeMsgEnabled) return;
                const schedule = () => { var c2 = getCurrentContact();
                    const minMs = (c2 ? getContactReplySetting(c2, 'activeMsgMin') : (settings.activeMsgMin || 10)) * 60000;
                    const maxMs = Math.max((c2 ? getContactReplySetting(c2, 'activeMsgMax') : (settings.activeMsgMax || 60)) * 60000, minMs);
                    const delay = minMs + Math.random() * (maxMs - minMs);
                    activeMsgTimer = setTimeout(async () => { if (Math.random() < (c2 ? getContactReplySetting(c2, 'activeMsgChance') : (settings.activeMsgChance || 0.3)))
                            triggerUnifiedReply();
                        schedule(); }, delay); };
                schedule();
            }

            function startPartnerCallTimer() {
                if (partnerCallTimer) clearTimeout(partnerCallTimer);
                const schedule = () => { partnerCallTimer = setTimeout(() => { var c = getCurrentContact();
                        if (callState.status === 'idle' && buildWordCardPool(currentContactId).length > 0 && c &&
                            Math.random() < getContactReplySetting(c, 'partnerCallChance')) incomingCall();
                        schedule(); }, 30 * 60 * 1000 + Math.random() * 3 * 60 * 60 * 1000); };
                schedule();
            }

            function startPartnerLetterTimer() {
                if (partnerLetterTimer) clearTimeout(partnerLetterTimer);
                const schedule = () => {
                    const hMin = settings.partnerLetterMin || 10;
                    const hMax = settings.partnerLetterMax || 24;
                    const minMs = hMin * 60 * 60 * 1000;
                    const maxMs = hMax * 60 * 60 * 1000;
                    const delay = minMs + Math.random() * (maxMs - minMs);
                    partnerLetterTimer = setTimeout(async () => {
                        for (const contact of contacts) {
                            if (!getContactReplySetting(contact, 'partnerLetterEnabled')) continue;
                            const contactChance = getContactReplySetting(contact, 'partnerLetterChance');
                            const cChance = contactChance !== undefined ? contactChance : 0.3;
                            if (Math.random() < cChance) await partnerSendLetter(contact.id);
                        }
                        processPendingLetterReplies();
                        schedule(); }, delay); };
                schedule();
            }

            async function partnerSendLetter(contactId) {
                const contact = contacts.find(c => c.id === contactId);
                if (!contact) return;
                const wordCardPool = buildWordCardPool(contactId);
                if (!wordCardPool.length) return;
                const count = 5 + Math.floor(Math.random() * 11);
                const parts = [];
                for (let i = 0; i < count; i++) parts.push(wordCardPool[Math.floor(Math.random() * wordCardPool.length)]);
                const letterText = `亲爱的${settings.myName}：\n\n${parts.join('')}\n\n—— 你的${contact.name}`;
                const letter = { type: 'letter', text: letterText, isMe: false, timestamp: new Date().toISOString(),
                    read: false, replyTo: null, reply: null, contactId };
                const id = await addData('letters', letter);
                letter.id = id;
                letters.push(letter);
                if (currentContactId === contactId) renderLetterList();
                showLetterNotification(`${contact.name} 给你写信啦 💌`);
            }

            function setupFloatWindowDrag() {
                const fw = document.getElementById('call-float-window');
                if (!fw) return;
                fw.addEventListener('mousedown', e => { if (e.target.closest('#float-hangup-btn')) return;
                    floatWindowDragState.isDragging = true;
                    floatWindowDragState.startX = e.clientX;
                    floatWindowDragState.startY = e.clientY;
                    floatWindowDragState.initialX = fw.offsetLeft;
                    floatWindowDragState.initialY = fw.offsetTop;
                    e.preventDefault(); });
                document.addEventListener('mousemove', e => { if (!floatWindowDragState.isDragging) return; const dx = e
                        .clientX - floatWindowDragState.startX,
                    dy = e.clientY - floatWindowDragState.startY; let nx = floatWindowDragState.initialX + dx,
                    ny = floatWindowDragState.initialY + dy;
                    nx = Math.max(0, Math.min(window.innerWidth - fw.offsetWidth, nx));
                    ny = Math.max(0, Math.min(window.innerHeight - fw.offsetHeight, ny));
                    fw.style.left = nx + 'px';
                    fw.style.top = ny + 'px';
                    fw.style.right = 'auto';
                    fw.style.bottom = 'auto'; });
                document.addEventListener('mouseup', () => { floatWindowDragState.isDragging = false; });
                fw.addEventListener('touchstart', e => { if (e.target.closest('#float-hangup-btn')) return;
                    floatWindowDragState.isDragging = true;
                    floatWindowDragState.startX = e.touches[0].clientX;
                    floatWindowDragState.startY = e.touches[0].clientY;
                    floatWindowDragState.initialX = fw.offsetLeft;
                    floatWindowDragState.initialY = fw.offsetTop;
                    e.preventDefault(); });
                document.addEventListener('touchmove', e => { if (!floatWindowDragState.isDragging) return; const dx = e
                        .touches[0].clientX - floatWindowDragState.startX,
                    dy = e.touches[0].clientY - floatWindowDragState.startY; let nx = floatWindowDragState
                        .initialX + dx,
                    ny = floatWindowDragState.initialY + dy;
                    nx = Math.max(0, Math.min(window.innerWidth - fw.offsetWidth, nx));
                    ny = Math.max(0, Math.min(window.innerHeight - fw.offsetHeight, ny));
                    fw.style.left = nx + 'px';
                    fw.style.top = ny + 'px';
                    fw.style.right = 'auto';
                    fw.style.bottom = 'auto';
                    e.preventDefault(); });
                document.addEventListener('touchend', () => { floatWindowDragState.isDragging = false; });
            }

            function setupGroupFloatWindowDrag() {
                const fw = document.getElementById('group-call-float-window');
                if (!fw) return;
                fw.addEventListener('mousedown', e => { if (e.target.closest('#group-float-hangup-btn')) return;
                    floatWindowDragState.isDragging = true;
                    floatWindowDragState.startX = e.clientX;
                    floatWindowDragState.startY = e.clientY;
                    floatWindowDragState.initialX = fw.offsetLeft;
                    floatWindowDragState.initialY = fw.offsetTop;
                    e.preventDefault(); });
                document.addEventListener('mousemove', e => { if (!floatWindowDragState.isDragging) return; const dx = e
                        .clientX - floatWindowDragState.startX,
                    dy = e.clientY - floatWindowDragState.startY; let nx = floatWindowDragState.initialX + dx,
                    ny = floatWindowDragState.initialY + dy;
                    nx = Math.max(0, Math.min(window.innerWidth - fw.offsetWidth, nx));
                    ny = Math.max(0, Math.min(window.innerHeight - fw.offsetHeight, ny));
                    fw.style.left = nx + 'px';
                    fw.style.top = ny + 'px';
                    fw.style.right = 'auto';
                    fw.style.bottom = 'auto'; });
                document.addEventListener('mouseup', () => { floatWindowDragState.isDragging = false; });
                fw.addEventListener('touchstart', e => { if (e.target.closest('#group-float-hangup-btn')) return;
                    floatWindowDragState.isDragging = true;
                    floatWindowDragState.startX = e.touches[0].clientX;
                    floatWindowDragState.startY = e.touches[0].clientY;
                    floatWindowDragState.initialX = fw.offsetLeft;
                    floatWindowDragState.initialY = fw.offsetTop;
                    e.preventDefault(); });
                document.addEventListener('touchmove', e => { if (!floatWindowDragState.isDragging) return; const dx = e
                        .touches[0].clientX - floatWindowDragState.startX,
                    dy = e.touches[0].clientY - floatWindowDragState.startY; let nx = floatWindowDragState
                        .initialX + dx,
                    ny = floatWindowDragState.initialY + dy;
                    nx = Math.max(0, Math.min(window.innerWidth - fw.offsetWidth, nx));
                    ny = Math.max(0, Math.min(window.innerHeight - fw.offsetHeight, ny));
                    fw.style.left = nx + 'px';
                    fw.style.top = ny + 'px';
                    fw.style.right = 'auto';
                    fw.style.bottom = 'auto';
                    e.preventDefault(); });
                document.addEventListener('touchend', () => { floatWindowDragState.isDragging = false; });
            }

            function startVoiceRecording() {
                if (voiceRecordState.isRecording) return;
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    showToast('您的浏览器不支持录音功能');
                    return;
                }
                navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                    voiceRecordState.isRecording = true;
                    voiceRecordState.chunks = [];
                    voiceRecordState.isCancelled = false;
                    voiceRecordState.startTime = Date.now();
                    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                    voiceRecordState.mediaRecorder = mediaRecorder;
                    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) voiceRecordState.chunks.push(e
                        .data); };
                    mediaRecorder.onstop = () => {
                        stream.getTracks().forEach(t => t.stop());
                        if (voiceRecordState.isCancelled) {
                            voiceRecordState.isRecording = false;
                            hideVoiceRecordUI();
                            return;
                        }
                        const blob = new Blob(voiceRecordState.chunks, { type: 'audio/webm' });
                        const reader = new FileReader();
                        reader.onload = async () => {
                            const base64 = reader.result;
                            const duration = Math.round((Date.now() - voiceRecordState.startTime) / 1000);
                            await sendVoiceMessage(base64, duration);
                            voiceRecordState.isRecording = false;
                            hideVoiceRecordUI();
                        };
                        reader.readAsDataURL(blob);
                    };
                    mediaRecorder.start();
                    showVoiceRecordUI();
                    voiceRecordState.timerInterval = setInterval(() => {
                        const elapsed = Math.floor((Date.now() - voiceRecordState.startTime) / 1000);
                        const mins = Math.floor(elapsed / 60);
                        const secs = elapsed % 60;
                        document.getElementById('voice-record-timer').textContent =
                            `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                    }, 200);
                }).catch(() => {
                    showToast('无法获取麦克风权限');
                });
            }

            function showVoiceRecordUI() {
                document.getElementById('voice-record-overlay').classList.add('show');
                document.getElementById('send-btn').classList.add('recording');
                document.getElementById('send-btn').innerHTML = '<i class="fa fa-microphone"></i>';
                document.getElementById('voice-record-timer').textContent = '00:00';
                document.getElementById('voice-cancel-zone').classList.remove('show');
            }

            function hideVoiceRecordUI() {
                document.getElementById('voice-record-overlay').classList.remove('show');
                document.getElementById('send-btn').classList.remove('recording');
                document.getElementById('send-btn').innerHTML = '<i class="fa fa-paper-plane"></i>';
                document.getElementById('voice-cancel-zone').classList.remove('show');
                if (voiceRecordState.timerInterval) { clearInterval(voiceRecordState.timerInterval);
                    voiceRecordState.timerInterval = null; }
            }

            function stopVoiceRecording(cancel = false) {
                if (!voiceRecordState.isRecording) return;
                voiceRecordState.isCancelled = cancel;
                if (voiceRecordState.mediaRecorder && voiceRecordState.mediaRecorder.state === 'recording') {
                    voiceRecordState.mediaRecorder.stop();
                }
                if (voiceRecordState.timerInterval) { clearInterval(voiceRecordState.timerInterval);
                    voiceRecordState.timerInterval = null; }
                voiceRecordState.isRecording = false;
                hideVoiceRecordUI();
            }

            function setupVoiceRecordEvents() {
                const sendBtn = document.getElementById('send-btn');
                if (!sendBtn) return;
                sendBtn.addEventListener('mousedown', (e) => {
                    voiceRecordState.touchStartY = e.clientY;
                    voiceRecordState.longPressTimer = setTimeout(() => {
                        voiceRecordState.isLongPress = true;
                        startVoiceRecording();
                    }, 300);
                });
                sendBtn.addEventListener('mousemove', (e) => {
                    if (voiceRecordState.isRecording) {
                        const dy = voiceRecordState.touchStartY - e.clientY;
                        if (dy > 50) {
                            document.getElementById('voice-cancel-zone').classList.add('show');
                            voiceRecordState.isCancelled = true;
                        } else {
                            document.getElementById('voice-cancel-zone').classList.remove('show');
                            voiceRecordState.isCancelled = false;
                        }
                    }
                });
                sendBtn.addEventListener('mouseup', () => {
                    clearTimeout(voiceRecordState.longPressTimer);
                    if (voiceRecordState.isRecording) {
                        voiceRecordState.preventClick = true;
                        stopVoiceRecording(voiceRecordState.isCancelled);
                    }
                    voiceRecordState.isLongPress = false;
                });
                sendBtn.addEventListener('mouseleave', () => {
                    clearTimeout(voiceRecordState.longPressTimer);
                    if (voiceRecordState.isRecording) {
                        stopVoiceRecording(true);
                    }
                    voiceRecordState.isLongPress = false;
                });
                sendBtn.addEventListener('touchstart', (e) => {
                    voiceRecordState.touchStartY = e.touches[0].clientY;
                    voiceRecordState.longPressTimer = setTimeout(() => {
                        voiceRecordState.isLongPress = true;
                        startVoiceRecording();
                    }, 300);
                });
                sendBtn.addEventListener('touchmove', (e) => {
                    if (voiceRecordState.isRecording) {
                        const dy = voiceRecordState.touchStartY - e.touches[0].clientY;
                        if (dy > 50) {
                            document.getElementById('voice-cancel-zone').classList.add('show');
                            voiceRecordState.isCancelled = true;
                        } else {
                            document.getElementById('voice-cancel-zone').classList.remove('show');
                            voiceRecordState.isCancelled = false;
                        }
                    }
                });
                sendBtn.addEventListener('touchend', () => {
                    clearTimeout(voiceRecordState.longPressTimer);
                    if (voiceRecordState.isRecording) {
                        voiceRecordState.preventClick = true;
                        stopVoiceRecording(voiceRecordState.isCancelled);
                    }
                    voiceRecordState.isLongPress = false;
                });
                sendBtn.addEventListener('touchcancel', () => {
                    clearTimeout(voiceRecordState.longPressTimer);
                    if (voiceRecordState.isRecording) {
                        stopVoiceRecording(true);
                    }
                    voiceRecordState.isLongPress = false;
                });
                sendBtn.addEventListener('click', (e) => {
                    if (voiceRecordState.preventClick) {
                        e.stopImmediatePropagation();
                        e.preventDefault();
                        voiceRecordState.preventClick = false;
                    }
                });
            }

            function renderWordCardGroups() {
                const el = document.getElementById('word-card-groups');
                if (!el) return;
                el.innerHTML = '';
                if (!wordCardGroups.length) {
                    el.innerHTML = '<p class="text-xs text-center py-2">暂无分组</p>';
                    return;
                }
                wordCardGroups.forEach((g, idx) => {
                    const d = document.createElement('div');
                    d.className =
                        'flex items-center justify-between p-2 bg-[var(--card-bg)] rounded-lg text-sm cursor-pointer hover:bg-[var(--theme-light)] transition-colors';
                    d.dataset.index = idx;
                    d.innerHTML = `
                <span class="truncate font-medium flex-1">${escapeHtml(g.name)} <span class="text-xs text-[var(--text-secondary)]">${g.cards.length}张</span></span>
                <div class="flex items-center space-x-1 flex-shrink-0">
                  <button class="edit-group-btn text-[var(--text-secondary)] hover:text-[var(--theme)] p-1" title="编辑分组"><i class="fa fa-pencil"></i></button>
                  <button class="delete-group-btn text-red-400 hover:text-red-600 p-1" title="删除分组"><i class="fa fa-trash"></i></button>
                  <label class="mr-1"><input type="checkbox" class="group-toggle" ${g.enabled?'checked':''}></label>
                  <i class="fa fa-chevron-right text-[var(--text-secondary)]"></i>
                </div>
              `;
                    d.querySelector('.group-toggle').addEventListener('change', async e => {
                        e.stopPropagation();
                        g.enabled = e.target.checked;
                        await updateData('wordCards', g);
                    });
                    d.querySelector('.edit-group-btn').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const newName = prompt('修改分组名称', g.name);
                        if (newName && newName.trim()) {
                            g.name = newName.trim();
                            await updateData('wordCards', g);
                            renderWordCardGroups();
                            showToast('分组名称已更新 ✅');
                        }
                    });
                    d.querySelector('.delete-group-btn').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (!confirm(`确定删除分组「${g.name}」及其所有字卡吗？`)) return;
                        wordCardGroups.splice(idx, 1);
                        await deleteData('wordCards', g.id);
                        renderWordCardGroups();
                        showToast(`分组「${g.name}」已删除 ✅`);
                    });
                    d.onclick = ev => {
                        if (ev.target.closest('button') || ev.target.closest('label')) return;
                        ev.stopPropagation();
                        showWordCardDetail(g);
                    };
                    el.appendChild(d);
                });
            }

            function showWordCardDetail(group) {
                const c = document.getElementById('sub-content');
                c.innerHTML = `
              <div class="flex items-center mb-4">
                <button id="back-to-groups" class="text-[var(--text-secondary)] mr-3"><i class="fa fa-arrow-left"></i></button>
                <h3 class="font-semibold text-lg">${escapeHtml(group.name)}</h3>
              </div>
              <div id="detail-word-list" class="space-y-2 mb-4"></div>
              <button id="add-card-btn" class="w-full py-2 border border-dashed border-[var(--border-color)] rounded-xl text-sm mb-2">+ 添加字卡</button>
              <textarea id="batch-import-cards" rows="3" placeholder="批量导入（每行一条）" class="w-full px-3 py-2 border rounded-xl text-sm resize-none mb-2"></textarea>
              <button id="import-cards-btn" class="w-full py-2 text-white rounded-xl text-sm mb-3" style="background:var(--theme)">导入并去重</button>
              <div class="flex space-x-2 mb-3">
                <button id="export-group-btn" class="flex-1 py-2 bg-[var(--theme-light)] rounded-lg text-sm text-[var(--text-primary)]">
                  <i class="fa fa-download mr-1"></i>导出当前分组
                </button>
                <label class="flex-1 py-2 bg-[var(--theme-light)] rounded-lg text-sm text-[var(--text-primary)] text-center cursor-pointer">
                  <i class="fa fa-upload mr-1"></i>导入文件
                  <input type="file" id="import-group-file" accept=".json,.txt" class="hidden">
                </label>
              </div>
            `;
                renderDetailWordList(group);
                document.getElementById('back-to-groups').addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    openSubPage('wordcards');
                });
                document.getElementById('add-card-btn').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const t = prompt('输入字卡');
                    if (t?.trim()) {
                        const trimmed = t.trim();
                        if (group.cards.includes(trimmed)) {
                            showToast('当前分组已存在');
                            return;
                        }
                        if (isSharedCardDuplicate(trimmed)) {
                            showToast('该字卡已在其他共用分组中存在');
                            return;
                        }
                        let isExclusiveDuplicate = false;
                        for (const contact of contacts) {
                            if (contact.uniqueWordCardGroups) {
                                for (const exGroup of contact.uniqueWordCardGroups) {
                                    if (exGroup.cards.includes(trimmed)) {
                                        isExclusiveDuplicate = true;
                                        break;
                                    }
                                }
                            }
                            if (isExclusiveDuplicate) break;
                        }
                        if (isExclusiveDuplicate) {
                            showToast('该字卡已在专属字卡中存在');
                            return;
                        }
                        group.cards.push(trimmed);
                        await updateData('wordCards', group);
                        renderDetailWordList(group);
                    }
                });
                document.getElementById('import-cards-btn').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const lines = document.getElementById('batch-import-cards').value.split('\n').map(l => l.trim())
                        .filter(l => l);
                    let addedCount = 0;
                    let duplicateCount = 0;
                    lines.forEach(l => {
                        if (group.cards.includes(l)) {
                            duplicateCount++;
                            return;
                        }
                        if (isSharedCardDuplicate(l)) {
                            duplicateCount++;
                            return;
                        }
                        let isExclusiveDuplicate = false;
                        for (const contact of contacts) {
                            if (contact.uniqueWordCardGroups) {
                                for (const exGroup of contact.uniqueWordCardGroups) {
                                    if (exGroup.cards.includes(l)) {
                                        isExclusiveDuplicate = true;
                                        break;
                                    }
                                }
                            }
                            if (isExclusiveDuplicate) break;
                        }
                        if (isExclusiveDuplicate) {
                            duplicateCount++;
                            return;
                        }
                        group.cards.push(l);
                        addedCount++;
                    });
                    await updateData('wordCards', group);
                    document.getElementById('batch-import-cards').value = '';
                    renderDetailWordList(group);
                    showToast(`导入完成：新增${addedCount}条，跳过重复${duplicateCount}条 ✅`);
                });
                document.getElementById('export-group-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const data = {
                        type: 'shared-wordcards',
                        groupName: group.name,
                        cards: group.cards,
                        exportTime: new Date().toISOString()
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `共用字卡_${group.name}_${new Date().toISOString().slice(0, 10)}.json`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                    showToast('导出成功 ✅');
                });
                document.getElementById('import-group-file').addEventListener('change', async (e) => {
                    e.stopPropagation();
                    const file = e.target.files[0];
                    if (!file) return;
                    const mode = confirm('点击"确定"选择【全覆盖模式】（替换当前所有字卡）\n点击"取消"选择【追加模式】（只添加不重复的字卡）');
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                        try {
                            let lines = [];
                            if (file.name.endsWith('.json')) {
                                const data = JSON.parse(ev.target.result);
                                if (data.cards && Array.isArray(data.cards)) {
                                    lines = data.cards;
                                } else {
                                    showToast('文件格式错误');
                                    return;
                                }
                            } else {
                                lines = ev.target.result.split('\n').map(l => l.trim()).filter(l => l);
                            }
                            if (mode) {
                                if (!confirm(`确定用文件中的 ${lines.length} 条字卡替换当前分组的 ${group.cards.length} 条字卡吗？`)) {
                                    e.target.value = '';
                                    return;
                                }
                                group.cards = [];
                                group.blockedCards = [];
                            }
                            let addedCount = 0;
                            let duplicateCount = 0;
                            for (const line of lines) {
                                if (group.cards.includes(line)) {
                                    duplicateCount++;
                                    continue;
                                }
                                if (isSharedCardDuplicate(line)) {
                                    duplicateCount++;
                                    continue;
                                }
                                let isExclusiveDup = false;
                                for (const contact of contacts) {
                                    if (contact.uniqueWordCardGroups) {
                                        for (const exGroup of contact.uniqueWordCardGroups) {
                                            if (exGroup.cards.includes(line)) {
                                                isExclusiveDup = true;
                                                break;
                                            }
                                        }
                                    }
                                    if (isExclusiveDup) break;
                                }
                                if (isExclusiveDup) {
                                    duplicateCount++;
                                    continue;
                                }
                                group.cards.push(line);
                                addedCount++;
                            }
                            await updateData('wordCards', group);
                            renderDetailWordList(group);
                            showToast(`导入完成：新增${addedCount}条，跳过重复${duplicateCount}条 ✅`);
                        } catch (err) {
                            showToast('导入失败：' + err.message);
                        }
                    };
                    if (file.name.endsWith('.json')) {
                        reader.readAsText(file);
                    } else {
                        reader.readAsText(file);
                    }
                    e.target.value = '';
                });
            }

            function renderDetailWordList(group) {
                const el = document.getElementById('detail-word-list');
                if (!el) return;
                el.innerHTML = '';
                if (!group.blockedCards) group.blockedCards = [];
                group.cards.forEach((card, idx) => {
                    const isBlocked = group.blockedCards.includes(card);
                    const d = document.createElement('div');
                    d.className = 'flex items-center justify-between p-2 bg-[var(--card-bg)] rounded-lg text-sm';
                    d.innerHTML = `
                <span class="truncate flex-1 ${isBlocked ? 'opacity-40 line-through' : ''}">${escapeHtml(card)}</span>
                <div class="flex items-center space-x-1 flex-shrink-0">
                  <button class="toggle-block-btn text-[var(--text-secondary)] hover:text-[var(--theme)] p-1" title="${isBlocked ? '取消屏蔽' : '屏蔽此字卡'}">
                    <i class="fa ${isBlocked ? 'fa-eye-slash' : 'fa-eye'}"></i>
                  </button>
                  <button class="edit-card-btn text-[var(--text-secondary)] hover:text-[var(--theme)] p-1" title="编辑"><i class="fa fa-pencil"></i></button>
                  <button class="delete-card-btn text-red-400 hover:text-red-600 p-1" title="删除"><i class="fa fa-trash"></i></button>
                </div>
              `;
                    d.querySelector('.toggle-block-btn').onclick = async (e) => {
                        e.stopPropagation();
                        if (!group.blockedCards) group.blockedCards = [];
                        const idx2 = group.blockedCards.indexOf(card);
                        if (idx2 === -1) {
                            group.blockedCards.push(card);
                        } else {
                            group.blockedCards.splice(idx2, 1);
                        }
                        await updateData('wordCards', group);
                        renderDetailWordList(group);
                    };
                    d.querySelector('.edit-card-btn').onclick = (e) => {
                        e.stopPropagation();
                        const n = prompt('修改字卡内容', card);
                        if (n?.trim()) {
                            const trimmed = n.trim();
                            if (trimmed !== card) {
                                const otherCards = group.cards.filter((c, i) => i !== idx);
                                if (otherCards.includes(trimmed)) {
                                    showToast('当前分组已存在该字卡');
                                    return;
                                }
                                if (isSharedCardDuplicate(trimmed)) {
                                    showToast('其他共用分组已存在该字卡');
                                    return;
                                }
                                for (const contact of contacts) {
                                    if (contact.uniqueWordCardGroups) {
                                        for (const exGroup of contact.uniqueWordCardGroups) {
                                            if (exGroup.cards.includes(trimmed)) {
                                                showToast('专属字卡中已存在该字卡');
                                                return;
                                            }
                                        }
                                    }
                                }
                            }
                            const blockedIdx = group.blockedCards.indexOf(card);
                            group.cards[idx] = trimmed;
                            if (blockedIdx !== -1) {
                                group.blockedCards[blockedIdx] = trimmed;
                            }
                            updateData('wordCards', group);
                            renderDetailWordList(group);
                        }
                    };
                    d.querySelector('.delete-card-btn').onclick = async (e) => {
                        e.stopPropagation();
                        if (confirm('确定删除这条字卡吗？')) {
                            const delCard = card;
                            group.cards.splice(idx, 1);
                            const bIdx = group.blockedCards.indexOf(delCard);
                            if (bIdx !== -1) group.blockedCards.splice(bIdx, 1);
                            await updateData('wordCards', group);
                            renderDetailWordList(group);
                        }
                    };
                    el.appendChild(d);
                });
            }

            function renderContactWordCardGroups() {
                const container = document.getElementById('contact-wordcard-groups');
                const select = document.getElementById('contact-select-for-wordcards');
                if (!container || !select) return;
                select.innerHTML = '<option value="">选择联系人管理专属字卡</option>';
                contacts.forEach(c => {
                    const o = document.createElement('option');
                    o.value = c.id;
                    o.textContent = c.name;
                    select.appendChild(o);
                });
                container.innerHTML = '';
                const cid = parseInt(select.value);
                if (!cid) { container.innerHTML =
                    '<p class="text-xs text-center py-4 text-[var(--text-secondary)]">请先选择联系人</p>'; return; }
                const contact = contacts.find(c => c.id === cid);
                if (!contact || !contact.uniqueWordCardGroups) return;
                contact.uniqueWordCardGroups.forEach((g, gIdx) => {
                    if (!g.blockedCards) g.blockedCards = [];
                    const div = document.createElement('div');
                    div.className = 'border border-[var(--border-color)] rounded-xl p-3 mb-2';
                    div.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                  <span class="font-medium text-sm flex-1 truncate">${escapeHtml(g.name)} <span class="text-xs text-[var(--text-secondary)]">${g.cards.length}张</span></span>
                  <div class="flex items-center space-x-1 flex-shrink-0">
                    <button class="edit-contact-group-btn text-[var(--text-secondary)] hover:text-[var(--theme)] p-1" title="编辑分组"><i class="fa fa-pencil"></i></button>
                    <button class="delete-contact-group-btn text-red-400 hover:text-red-600 p-1" title="删除分组"><i class="fa fa-trash"></i></button>
                    <input type="checkbox" ${g.enabled?'checked':''} onchange="window.toggleContactWordCardGroup(${contact.id},${gIdx},this.checked)">
                  </div>
                </div>
                <div class="flex flex-wrap gap-1">${g.cards.map((c,i) => {
                  const blocked = g.blockedCards.includes(c);
                  return `<span class="text-xs bg-[var(--theme-light)] px-2 py-0.5 rounded-full ${blocked ? 'opacity-40 line-through' : ''}">${escapeHtml(c)} <button onclick="window.deleteContactWordCard(${contact.id},${gIdx},${i})" class="ml-1 text-red-400">×</button> <button onclick="window.toggleContactWordCardBlock(${contact.id},${gIdx},${i})" class="ml-1 text-[var(--text-secondary)] hover:text-[var(--theme)]" title="${blocked ? '取消屏蔽' : '屏蔽'}"><i class="fa ${blocked ? 'fa-eye-slash' : 'fa-eye'}"></i></button></span>`;
                }).join('')}</div>
                <div class="flex space-x-1 mt-2">
                  <input type="text" placeholder="添加字卡" class="flex-1 px-2 py-1 border rounded text-xs" onkeydown="if(event.key==='Enter')window.addContactWordCard(${contact.id},${gIdx},this)">
                  <button onclick="window.addContactWordCard(${contact.id},${gIdx},this.previousElementSibling)" class="px-2 py-1 text-white rounded text-xs" style="background:var(--theme)">+</button>
                </div>
              `;
                    div.querySelector('.edit-contact-group-btn').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const newName = prompt('修改分组名称', g.name);
                        if (newName && newName.trim()) {
                            g.name = newName.trim();
                            await updateContact(contact);
                            renderContactWordCardGroups();
                            showToast('分组名称已更新 ✅');
                        }
                    });
                    div.querySelector('.delete-contact-group-btn').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (!confirm(`确定删除分组「${g.name}」及其所有字卡吗？`)) return;
                        contact.uniqueWordCardGroups.splice(gIdx, 1);
                        await updateContact(contact);
                        renderContactWordCardGroups();
                        showToast(`分组「${g.name}」已删除 ✅`);
                    });
                    container.appendChild(div);
                });
            }

            function renderContactWordCardGroupsInModal(contact, content) {
                if (!contact.uniqueWordCardGroups) contact.uniqueWordCardGroups = [];
                var html = '<div class="text-sm space-y-3 max-h-[60vh] overflow-y-auto">';
                if (!contact.uniqueWordCardGroups.length) {
                    html += '<p class="text-xs text-center py-4 text-[var(--text-secondary)]">暂无专属字卡分组</p>';
                } else {
                    contact.uniqueWordCardGroups.forEach(function(g, gIdx) {
                        if (!g.blockedCards) g.blockedCards = [];
                        html += '<div class="border border-[var(--border-color)] rounded-xl p-3 mb-3">';
                        html += '<div class="flex items-center justify-between mb-2">';
                        html += '<span class="font-medium text-sm flex-1 truncate">' + escapeHtml(g.name) + ' <span class="text-xs text-[var(--text-secondary)]">' + g.cards.length + '张</span></span>';
                        html += '<div class="flex items-center space-x-1 flex-shrink-0">';
                        html += '<button class="edit-contact-group-btn text-[var(--text-secondary)] hover:text-[var(--theme)] p-1" title="编辑分组"><i class="fa fa-pencil"></i></button>';
                        html += '<button class="delete-contact-group-btn text-red-400 hover:text-red-600 p-1" title="删除分组"><i class="fa fa-trash"></i></button>';
                        html += '<input type="checkbox" ' + (g.enabled ? 'checked' : '') + ' data-cid="' + contact.id + '" data-gidx="' + gIdx + '" class="wc-group-toggle"></div></div>';
                        html += '<div class="flex flex-wrap gap-2.5 mb-3">';
                        g.cards.forEach(function(c, i) {
                            var blocked = g.blockedCards.includes(c);
                            html += '<span class="text-sm bg-[var(--theme-light)] px-3 py-1.5 rounded-xl leading-relaxed ' + (blocked ? 'opacity-40 line-through' : '') + '">' + escapeHtml(c) + ' <button class="edit-wc-card ml-1.5 text-[var(--text-secondary)] hover:text-[var(--theme)]" data-cid="' + contact.id + '" data-gidx="' + gIdx + '" data-idx="' + i + '" title="编辑"><i class="fa fa-pencil-square-o" style="pointer-events:none;"></i></button> <button class="del-wc-card ml-1 text-red-400 hover:text-red-600" data-cid="' + contact.id + '" data-gidx="' + gIdx + '" data-idx="' + i + '" title="删除"><i class="fa fa-times" style="pointer-events:none;"></i></button> <button class="toggle-wc-block ml-1 text-[var(--text-secondary)] hover:text-[var(--theme)]" data-cid="' + contact.id + '" data-gidx="' + gIdx + '" data-idx="' + i + '" title="' + (blocked ? '取消屏蔽' : '屏蔽') + '"><i class="fa ' + (blocked ? 'fa-eye-slash' : 'fa-eye') + '" style="pointer-events:none;"></i></button></span>';
                        });
                        html += '</div>';
                        html += '<div class="flex space-x-1 mb-2">';
                        html += '<input type="text" placeholder="添加字卡" class="flex-1 px-2 py-1 border rounded text-xs" data-cid="' + contact.id + '" data-gidx="' + gIdx + '">';
                        html += '<button class="add-wc-card px-2 py-1 text-white rounded text-xs" style="background:var(--theme)" data-cid="' + contact.id + '" data-gidx="' + gIdx + '">+</button>';
                        html += '</div>';
                        html += '<div class="flex space-x-1"><textarea class="flex-1 px-2 py-1 border border-[var(--border-color)] rounded text-xs resize-none ex-batch-import" rows="2" placeholder="批量导入（每行一条）" data-cid="' + contact.id + '" data-gidx="' + gIdx + '"></textarea>';
                        html += '<button class="ex-batch-import-btn px-2 py-1 text-white rounded text-xs flex-shrink-0" style="background:var(--theme)" data-cid="' + contact.id + '" data-gidx="' + gIdx + '">导入并去重</button></div></div>';
                    });
                }
                html += '<button id="add-modal-wordcard-group" class="w-full py-2 border border-dashed border-[var(--border-color)] rounded-xl text-sm mt-2">+ 添加分组</button>';
                html += '</div>';
                content.innerHTML = html;
                content.querySelectorAll('.edit-contact-group-btn').forEach(function(btn) {
                    btn.onclick = function() {
                        var parent = this.closest('.border');
                        var nameEl = parent.querySelector('.font-medium');
                        var gIdx = parseInt(parent.querySelector('.wc-group-toggle')?.dataset.gidx || '0');
                        var newName = prompt('修改分组名称', nameEl ? nameEl.textContent.split(' ')[0] : '');
                        if (newName && newName.trim()) {
                            contact.uniqueWordCardGroups[gIdx].name = newName.trim();
                            updateContact(contact);
                            openChSubModal('manage-wordcards', contact);
                            showToast('分组名称已更新 ✅');
                        }
                    };
                });
                content.querySelectorAll('.delete-contact-group-btn').forEach(function(btn) {
                    btn.onclick = function() {
                        var parent = this.closest('.border');
                        var gIdx = parseInt(parent.querySelector('.wc-group-toggle')?.dataset.gidx || '0');
                        if (!confirm('确定删除分组及其所有字卡吗？')) return;
                        contact.uniqueWordCardGroups.splice(gIdx, 1);
                        updateContact(contact);
                        openChSubModal('manage-wordcards', contact);
                        showToast('分组已删除 ✅');
                    };
                });
                content.querySelectorAll('.wc-group-toggle').forEach(function(cb) {
                    cb.onchange = function() {
                        var gIdx = parseInt(this.dataset.gidx);
                        contact.uniqueWordCardGroups[gIdx].enabled = this.checked;
                        updateContact(contact);
                    };
                });
                content.querySelectorAll('.add-wc-card').forEach(function(btn) {
                    btn.onclick = function() {
                        var input = this.previousElementSibling;
                        var t = input.value.trim();
                        if (!t) return;
                        var gIdx = parseInt(this.dataset.gidx);
                        contact.uniqueWordCardGroups[gIdx].cards.push(t);
                        updateContact(contact);
                        openChSubModal('manage-wordcards', contact);
                        input.value = '';
                    };
                });
                content.querySelectorAll('.edit-wc-card').forEach(function(btn) {
                    btn.onclick = function() {
                        var gIdx = parseInt(this.dataset.gidx);
                        var idx = parseInt(this.dataset.idx);
                        var old = contact.uniqueWordCardGroups[gIdx].cards[idx] || '';
                        var n = prompt('修改字卡内容', old);
                        if (n && n.trim()) {
                            contact.uniqueWordCardGroups[gIdx].cards[idx] = n.trim();
                            var bIdx = (contact.uniqueWordCardGroups[gIdx].blockedCards || []).indexOf(old);
                            if (bIdx !== -1) { contact.uniqueWordCardGroups[gIdx].blockedCards[bIdx] = n.trim(); }
                            updateContact(contact);
                            openChSubModal('manage-wordcards', contact);
                            showToast('字卡已更新 ✅');
                        }
                    };
                });
                content.querySelectorAll('.del-wc-card').forEach(function(btn) {
                    btn.onclick = function() {
                        var gIdx = parseInt(this.dataset.gidx);
                        var idx = parseInt(this.dataset.idx);
                        var card = contact.uniqueWordCardGroups[gIdx].cards[idx];
                        contact.uniqueWordCardGroups[gIdx].cards.splice(idx, 1);
                        var bIdx = (contact.uniqueWordCardGroups[gIdx].blockedCards || []).indexOf(card);
                        if (bIdx !== -1) contact.uniqueWordCardGroups[gIdx].blockedCards.splice(bIdx, 1);
                        updateContact(contact);
                        openChSubModal('manage-wordcards', contact);
                    };
                });
                content.querySelectorAll('.toggle-wc-block').forEach(function(btn) {
                    btn.onclick = function() {
                        var gIdx = parseInt(this.dataset.gidx);
                        var idx = parseInt(this.dataset.idx);
                        var g = contact.uniqueWordCardGroups[gIdx];
                        if (!g.blockedCards) g.blockedCards = [];
                        var card = g.cards[idx];
                        var bIdx = g.blockedCards.indexOf(card);
                        if (bIdx === -1) g.blockedCards.push(card);
                        else g.blockedCards.splice(bIdx, 1);
                        updateContact(contact);
                        openChSubModal('manage-wordcards', contact);
                    };
                });
                content.querySelectorAll('.ex-batch-import-btn').forEach(function(btn) {
                    btn.onclick = function() {
                        var gIdx = parseInt(this.dataset.gidx);
                        var ta = this.previousElementSibling;
                        var lines = ta.value.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l; });
                        if (!lines.length) { showToast('请输入字卡内容'); return; }
                        var g = contact.uniqueWordCardGroups[gIdx];
                        if (!g.blockedCards) g.blockedCards = [];
                        var added = 0, dup = 0;
                        lines.forEach(function(line) {
                            if (g.cards.includes(line)) { dup++; return; }
                            if (isCardDuplicateGlobally(contact.id, gIdx, line)) { dup++; return; }
                            g.cards.push(line);
                            added++;
                        });
                        updateContact(contact);
                        openChSubModal('manage-wordcards', contact);
                        showToast('添加 ' + added + ' 张，去重 ' + dup + ' 张 ✅');
                    };
                });
                document.getElementById('add-modal-wordcard-group').onclick = function() {
                    var name = prompt('输入分组名称');
                    if (name && name.trim()) {
                        contact.uniqueWordCardGroups.push({ name: name.trim(), cards: [], enabled: true, blockedCards: [] });
                        updateContact(contact);
                        openChSubModal('manage-wordcards', contact);
                        showToast('分组已添加 ✅');
                    }
                };
            }

            window.toggleContactWordCardGroup = async (cid, gIdx, enabled) => {
                const c = contacts.find(cc => cc.id === cid);
                if (c?.uniqueWordCardGroups) {
                    c.uniqueWordCardGroups[gIdx].enabled = enabled;
                    await updateContact(c);
                    renderContactWordCardGroups();
                }
            };
            window.deleteContactWordCardGroup = async (cid, gIdx) => {
                const c = contacts.find(cc => cc.id === cid);
                if (c?.uniqueWordCardGroups && confirm('删除分组？')) {
                    c.uniqueWordCardGroups.splice(gIdx, 1);
                    await updateContact(c);
                    renderContactWordCardGroups();
                }
            };
            window.addContactWordCard = async (cid, gIdx, input) => {
                const c = contacts.find(cc => cc.id === cid);
                if (!c?.uniqueWordCardGroups) return;
                const t = input.value.trim();
                if (t) {
                    c.uniqueWordCardGroups[gIdx].cards.push(t);
                    await updateContact(c);
                    renderContactWordCardGroups();
                    input.value = '';
                }
            };
            window.deleteContactWordCard = async (cid, gIdx, cIdx) => {
                const c = contacts.find(cc => cc.id === cid);
                if (!c?.uniqueWordCardGroups) return;
                const card = c.uniqueWordCardGroups[gIdx].cards[cIdx];
                c.uniqueWordCardGroups[gIdx].cards.splice(cIdx, 1);
                const bIdx = (c.uniqueWordCardGroups[gIdx].blockedCards || []).indexOf(card);
                if (bIdx !== -1) c.uniqueWordCardGroups[gIdx].blockedCards.splice(bIdx, 1);
                await updateContact(c);
                renderContactWordCardGroups();
            };
            window.toggleContactWordCardBlock = async (cid, gIdx, cIdx) => {
                const c = contacts.find(cc => cc.id === cid);
                if (!c?.uniqueWordCardGroups) return;
                const g = c.uniqueWordCardGroups[gIdx];
                if (!g.blockedCards) g.blockedCards = [];
                const card = g.cards[cIdx];
                const idx2 = g.blockedCards.indexOf(card);
                if (idx2 === -1) {
                    g.blockedCards.push(card);
                } else {
                    g.blockedCards.splice(idx2, 1);
                }
                await updateContact(c);
                renderContactWordCardGroups();
            };

            window.renderExclusiveWordCardGroups = function(cid) {
                const container = document.getElementById('ex-wordcard-groups');
                const contact = contacts.find(c => c.id === cid);
                if (!container || !contact) return;
                container.innerHTML = '';
                if (!contact.uniqueWordCardGroups || !contact.uniqueWordCardGroups.length) {
                    container.innerHTML = '<p class="text-xs text-center py-4 text-[var(--text-secondary)]">暂无专属字卡分组</p>';
                    return;
                }
                contact.uniqueWordCardGroups.forEach((g, gIdx) => {
                    if (!g.blockedCards) g.blockedCards = [];
                    const div = document.createElement('div');
                    div.className = 'flex items-center justify-between p-2 bg-[var(--card-bg)] rounded-lg text-sm cursor-pointer hover:bg-[var(--theme-light)] transition-colors';
                    div.dataset.index = gIdx;
                    div.innerHTML = `
                        <span class="truncate font-medium flex-1">${escapeHtml(g.name)} <span class="text-xs text-[var(--text-secondary)]">${g.cards.length}张</span></span>
                        <div class="flex items-center space-x-1 flex-shrink-0">
                            <button class="edit-group-btn text-[var(--text-secondary)] hover:text-[var(--theme)] p-1" title="编辑分组名称"><i class="fa fa-pencil"></i></button>
                            <button class="delete-group-btn text-red-400 hover:text-red-600 p-1" title="删除分组"><i class="fa fa-trash"></i></button>
                            <label class="mr-1"><input type="checkbox" class="group-toggle" ${g.enabled ? 'checked' : ''}></label>
                            <i class="fa fa-chevron-right text-[var(--text-secondary)]"></i>
                        </div>
                    `;
                    div.querySelector('.group-toggle').addEventListener('change', async e => {
                        e.stopPropagation();
                        g.enabled = e.target.checked;
                        await updateContact(contact);
                    });
                    div.querySelector('.edit-group-btn').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const newName = prompt('修改分组名称', g.name);
                        if (newName && newName.trim()) {
                            g.name = newName.trim();
                            await updateContact(contact);
                            window.renderExclusiveWordCardGroups(cid);
                            showToast('分组名称已更新 ✅');
                        }
                    });
                    div.querySelector('.delete-group-btn').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (!confirm(`确定删除分组「${g.name}」及其所有字卡吗？`)) return;
                        contact.uniqueWordCardGroups.splice(gIdx, 1);
                        await updateContact(contact);
                        window.renderExclusiveWordCardGroups(cid);
                        showToast(`分组「${g.name}」已删除 ✅`);
                    });
                    div.onclick = ev => {
                        if (ev.target.closest('button') || ev.target.closest('label')) return;
                        ev.stopPropagation();
                        showExclusiveWordCardDetail(contact, g, gIdx, cid);
                    };
                    container.appendChild(div);
                });
            };

            function showExclusiveWordCardDetail(contact, group, groupIndex, contactId) {
                const subContent = document.getElementById('sub-content');
                if (!subContent) return;
                subContent.innerHTML = `
                    <div class="flex items-center mb-4">
                        <button id="back-to-ex-groups" class="text-[var(--text-secondary)] mr-3"><i class="fa fa-arrow-left"></i></button>
                        <h3 class="font-semibold text-lg">${escapeHtml(group.name)}</h3>
                    </div>
                    <div id="ex-detail-word-list" class="space-y-2 mb-4"></div>
                    <button id="ex-add-card-btn" class="w-full py-2 border border-dashed border-[var(--border-color)] rounded-xl text-sm mb-2">+ 添加字卡</button>
                    <textarea id="ex-batch-import-cards" rows="3" placeholder="批量导入（每行一条）" class="w-full px-3 py-2 border rounded-xl text-sm resize-none mb-2"></textarea>
                    <button id="ex-import-cards-btn" class="w-full py-2 text-white rounded-xl text-sm mb-3" style="background:var(--theme)">导入并去重</button>
                    <div class="flex space-x-2 mb-3">
                        <button id="ex-export-group-btn" class="flex-1 py-2 bg-[var(--theme-light)] rounded-lg text-sm text-[var(--text-primary)]">
                            <i class="fa fa-download mr-1"></i>导出当前分组
                        </button>
                        <label class="flex-1 py-2 bg-[var(--theme-light)] rounded-lg text-sm text-[var(--text-primary)] text-center cursor-pointer">
                            <i class="fa fa-upload mr-1"></i>导入文件
                            <input type="file" id="ex-import-group-file" accept=".json,.txt" class="hidden">
                        </label>
                    </div>
                `;
                renderExclusiveDetailWordList(contact, group, groupIndex, contactId);
                document.getElementById('back-to-ex-groups').addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    window.renderExclusiveWordCardGroups(contactId);
                    const sc = document.getElementById('sub-content');
                    if (sc) {
                        sc.innerHTML = `
                            <div id="ex-wordcard-groups" class="space-y-2 mb-3"></div>
                            <button id="add-exclusive-wordcard-group-btn" class="w-full py-2 border border-dashed border-[var(--border-color)] rounded-xl text-sm">+ 添加专属字卡分组</button>
                        `;
                        window.renderExclusiveWordCardGroups(contactId);
                    }
                });
                document.getElementById('ex-add-card-btn').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const text = prompt('输入字卡');
                    if (text?.trim()) {
                        const trimmed = text.trim();
                        if (isCardDuplicateGlobally(contactId, groupIndex, trimmed)) {
                            showToast('该字卡已存在（全局去重）');
                            return;
                        }
                        group.cards.push(trimmed);
                        await updateContact(contact);
                        renderExclusiveDetailWordList(contact, group, groupIndex, contactId);
                    }
                });
                document.getElementById('ex-import-cards-btn').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const lines = document.getElementById('ex-batch-import-cards').value.split('\n').map(l => l.trim())
                        .filter(l => l);
                    if (!lines.length) return;
                    let addedCount = 0;
                    let duplicateCount = 0;
                    lines.forEach(line => {
                        if (isCardDuplicateGlobally(contactId, groupIndex, line)) {
                            duplicateCount++;
                        } else {
                            group.cards.push(line);
                            addedCount++;
                        }
                    });
                    if (addedCount > 0) {
                        await updateContact(contact);
                        renderExclusiveDetailWordList(contact, group, groupIndex, contactId);
                    }
                    document.getElementById('ex-batch-import-cards').value = '';
                    showToast(`导入完成：新增${addedCount}条，跳过重复${duplicateCount}条 ✅`);
                });
                document.getElementById('ex-export-group-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const data = {
                        type: 'exclusive-wordcards',
                        contactName: contact.name,
                        groupName: group.name,
                        cards: group.cards,
                        exportTime: new Date().toISOString()
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `专属字卡_${contact.name}_${group.name}_${new Date().toISOString().slice(0, 10)}.json`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                    showToast('导出成功 ✅');
                });
                document.getElementById('ex-import-group-file').addEventListener('change', async (e) => {
                    e.stopPropagation();
                    const file = e.target.files[0];
                    if (!file) return;
                    const mode = confirm('点击"确定"选择【全覆盖模式】（替换当前所有字卡）\n点击"取消"选择【追加模式】（只添加不重复的字卡）');
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                        try {
                            let lines = [];
                            if (file.name.endsWith('.json')) {
                                const data = JSON.parse(ev.target.result);
                                if (data.cards && Array.isArray(data.cards)) {
                                    lines = data.cards;
                                } else {
                                    showToast('文件格式错误');
                                    return;
                                }
                            } else {
                                lines = ev.target.result.split('\n').map(l => l.trim()).filter(l => l);
                            }
                            if (mode) {
                                if (!confirm(`确定用文件中的 ${lines.length} 条字卡替换当前分组的 ${group.cards.length} 条字卡吗？`)) {
                                    e.target.value = '';
                                    return;
                                }
                                group.cards = [];
                                group.blockedCards = [];
                            }
                            let addedCount = 0;
                            let duplicateCount = 0;
                            for (const line of lines) {
                                if (group.cards.includes(line)) {
                                    duplicateCount++;
                                    continue;
                                }
                                const otherCards = getAllExclusiveCardsExcept(contactId, groupIndex, -1);
                                if (otherCards.includes(line)) {
                                    duplicateCount++;
                                    continue;
                                }
                                if (isSharedCardDuplicate(line)) {
                                    duplicateCount++;
                                    continue;
                                }
                                group.cards.push(line);
                                addedCount++;
                            }
                            await updateContact(contact);
                            renderExclusiveDetailWordList(contact, group, groupIndex, contactId);
                            showToast(`导入完成：新增${addedCount}条，跳过重复${duplicateCount}条 ✅`);
                        } catch (err) {
                            showToast('导入失败：' + err.message);
                        }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                });
            }

            function renderExclusiveDetailWordList(contact, group, groupIndex, contactId) {
                const el = document.getElementById('ex-detail-word-list');
                if (!el) return;
                el.innerHTML = '';
                if (!group.blockedCards) group.blockedCards = [];
                if (!group.cards.length) {
                    el.innerHTML = '<p class="text-xs text-center py-2">暂无字卡</p>';
                    return;
                }
                group.cards.forEach((card, idx) => {
                    const isBlocked = group.blockedCards.includes(card);
                    const div = document.createElement('div');
                    div.className = 'flex items-center justify-between p-3 bg-[var(--card-bg)] rounded-xl text-sm mb-2';
                    div.innerHTML = `
                        <span class="truncate flex-1 mr-2 ${isBlocked ? 'opacity-40 line-through' : ''}">${escapeHtml(card)}</span>
                        <div class="flex items-center space-x-1 flex-shrink-0">
                            <button class="toggle-block-btn text-[var(--text-secondary)] hover:text-[var(--theme)] p-1" title="${isBlocked ? '取消屏蔽' : '屏蔽此字卡'}">
                                <i class="fa ${isBlocked ? 'fa-eye-slash' : 'fa-eye'}"></i>
                            </button>
                            <button class="edit-card-btn text-[var(--text-secondary)] hover:text-[var(--theme)] p-1" title="编辑"><i class="fa fa-pencil"></i></button>
                            <button class="delete-card-btn text-red-400 hover:text-red-600 p-1" title="删除"><i class="fa fa-trash"></i></button>
                        </div>
                    `;
                    div.querySelector('.toggle-block-btn').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (!group.blockedCards) group.blockedCards = [];
                        const bIdx = group.blockedCards.indexOf(card);
                        if (bIdx === -1) {
                            group.blockedCards.push(card);
                        } else {
                            group.blockedCards.splice(bIdx, 1);
                        }
                        await updateContact(contact);
                        renderExclusiveDetailWordList(contact, group, groupIndex, contactId);
                    });
                    div.querySelector('.edit-card-btn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        const newText = prompt('修改字卡内容', card);
                        if (newText?.trim()) {
                            const trimmed = newText.trim();
                            const otherCards = group.cards.filter((c, i) => i !== idx);
                            if (otherCards.includes(trimmed)) {
                                showToast('该字卡已存在于当前分组');
                                return;
                            }
                            const allOtherCards = getAllExclusiveCardsExcept(contactId, groupIndex, idx);
                            if (allOtherCards.includes(trimmed)) {
                                showToast('该字卡已存在于其他分组');
                                return;
                            }
                            if (isSharedCardDuplicate(trimmed)) {
                                showToast('该字卡已在共用字卡中存在');
                                return;
                            }
                            const blockedIdx = group.blockedCards.indexOf(card);
                            group.cards[idx] = trimmed;
                            if (blockedIdx !== -1) {
                                group.blockedCards[blockedIdx] = trimmed;
                            }
                            updateContact(contact);
                            renderExclusiveDetailWordList(contact, group, groupIndex, contactId);
                        }
                    });
                    div.querySelector('.delete-card-btn').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (!confirm('确定删除这条字卡吗？')) return;
                        const delCard = card;
                        group.cards.splice(idx, 1);
                        const bIdx = group.blockedCards.indexOf(delCard);
                        if (bIdx !== -1) group.blockedCards.splice(bIdx, 1);
                        await updateContact(contact);
                        renderExclusiveDetailWordList(contact, group, groupIndex, contactId);
                    });
                    el.appendChild(div);
                });
            }

            function getAllExclusiveCardsExcept(contactId, excludeGroupIndex, excludeCardIndex) {
                const contact = contacts.find(c => c.id === contactId);
                if (!contact || !contact.uniqueWordCardGroups) return [];
                const allCards = [];
                contact.uniqueWordCardGroups.forEach((g, gIdx) => {
                    g.cards.forEach((c, cIdx) => {
                        if (gIdx !== excludeGroupIndex || cIdx !== excludeCardIndex) {
                            allCards.push(c);
                        }
                    });
                });
                return allCards;
            }

            function isCardDuplicateGlobally(contactId, excludeGroupIndex, cardText) {
                const sharedCards = [];
                wordCardGroups.forEach(g => {
                    g.cards.forEach(c => sharedCards.push(c));
                });
                if (sharedCards.includes(cardText)) return true;
                const contact = contacts.find(c => c.id === contactId);
                if (contact && contact.uniqueWordCardGroups) {
                    for (let gIdx = 0; gIdx < contact.uniqueWordCardGroups.length; gIdx++) {
                        if (gIdx === excludeGroupIndex) continue;
                        const g = contact.uniqueWordCardGroups[gIdx];
                        if (g.cards.includes(cardText)) return true;
                    }
                }
                return false;
            }

            window.renderExclusiveEmojiList = function(cid) {
                const container = document.getElementById('ex-emoji-list');
                const contact = contacts.find(c => c.id === cid);
                if (!container || !contact) return;
                container.innerHTML = '';
                if (!contact.uniqueEmojis || !contact.uniqueEmojis.length) {
                    container.innerHTML =
                    '<p class="text-xs text-center py-4 text-[var(--text-secondary)]">暂无专属表情包</p>';
                    return;
                }
                contact.uniqueEmojis.forEach((e, idx) => {
                    const d = document.createElement('div');
                    d.className = 'cursor-pointer rounded p-1';
                    d.innerHTML = `<img src="${e.src}" class="w-12 h-12 object-contain rounded">`;
                    d.onclick = () => sendStickerMsg(e.src, 'exclusive');
                    d.oncontextmenu = ev => {
                        ev.preventDefault();
                        if (confirm('删除此表情包？')) {
                            contact.uniqueEmojis.splice(idx, 1);
                            updateContact(contact);
                            window.renderExclusiveEmojiList(cid);
                        }
                    };
                    container.appendChild(d);
                });
            };

            window.renderExclusiveVoiceGroups = function(cid) {
                const container = document.getElementById('ex-voice-groups');
                const contact = contacts.find(c => c.id === cid);
                if (!container || !contact) return;
                container.innerHTML = '';
                if (!contact.uniqueVoiceGroups || !contact.uniqueVoiceGroups.length) {
                    container.innerHTML =
                    '<p class="text-xs text-center py-4 text-[var(--text-secondary)]">暂无专属语音分组</p>';
                    return;
                }
                contact.uniqueVoiceGroups.forEach((grp, gIdx) => {
                    const div = document.createElement('div');
                    div.className = 'border border-[var(--border-color)] rounded-xl p-3 mb-2';
                    div.innerHTML = `
                <div class="flex items-center justify-between mb-2"><input type="checkbox" ${grp.enabled?'checked':''} onchange="window.toggleExclusiveVG(${cid},${gIdx},this.checked)"><span class="font-medium text-sm">${escapeHtml(grp.name)}</span><button onclick="window.deleteExclusiveVG(${cid},${gIdx})" class="text-red-400 text-xs">删除分组</button></div>
                <div class="space-y-1">${grp.items.map((item,i)=>`<div class="flex items-center justify-between bg-[var(--card-bg)] rounded px-2 py-1 text-xs"><span class="truncate flex-1">🎵 ${escapeHtml(item.name||'语音'+i)} (${Math.round(item.duration||3)}秒)</span><div class="flex space-x-1"><button onclick="window.playExclusiveVoice('${item.src.replace(/'/g,"\\'")}')" class="text-[var(--theme)]"><i class="fa fa-play"></i></button><button onclick="window.deleteExclusiveVI(${cid},${gIdx},${i})" class="text-red-400"><i class="fa fa-trash"></i></button></div></div>`).join('')}</div>
                <div class="mt-2"><label class="block w-full py-1.5 bg-[var(--theme-light)] rounded text-center cursor-pointer text-xs">📁 上传音频文件<input type="file" accept="audio/*" class="hidden" onchange="window.uploadExclusiveVoice(${cid},${gIdx},this)"></label></div>
                <textarea placeholder="批量导入base64（每行一条：名称|base64数据|秒数）" class="w-full px-2 py-1 border rounded text-xs resize-none mt-1" id="ev-batch-${cid}-${gIdx}"></textarea>
                <button onclick="window.batchExclusiveVI(${cid},${gIdx})" class="w-full py-1 text-white rounded text-xs mt-1" style="background:var(--theme)">批量导入</button>
                `;
                    container.appendChild(div);
                });
            };

            window.toggleExclusiveVG = async (cid, gIdx, enabled) => {
                const c = contacts.find(cc => cc.id === cid);
                if (c?.uniqueVoiceGroups) {
                    c.uniqueVoiceGroups[gIdx].enabled = enabled;
                    await updateContact(c);
                    window.renderExclusiveVoiceGroups(cid);
                }
            };
            window.deleteExclusiveVG = async (cid, gIdx) => {
                const c = contacts.find(cc => cc.id === cid);
                if (c?.uniqueVoiceGroups && confirm('删除分组？')) {
                    c.uniqueVoiceGroups.splice(gIdx, 1);
                    await updateContact(c);
                    window.renderExclusiveVoiceGroups(cid);
                }
            };
            window.playExclusiveVoice = (src) => { const audio = new Audio(src);
                audio.play().catch(() => showToast('播放失败')); };
            window.deleteExclusiveVI = async (cid, gIdx, i) => {
                const c = contacts.find(cc => cc.id === cid);
                if (c?.uniqueVoiceGroups) {
                    c.uniqueVoiceGroups[gIdx].items.splice(i, 1);
                    await updateContact(c);
                    window.renderExclusiveVoiceGroups(cid);
                }
            };
            window.uploadExclusiveVoice = async (cid, gIdx, input) => {
                const files = input.files;
                if (!files.length) return;
                const c = contacts.find(cc => cc.id === cid);
                if (!c?.uniqueVoiceGroups) return;
                if (!c.uniqueVoiceGroups[gIdx]) return;
                const promises = Array.from(files).map(f => {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            const audio = new Audio(ev.target.result);
                            audio.onloadedmetadata = () => {
                                c.uniqueVoiceGroups[gIdx].items.push({ src: ev.target.result,
                                    duration: Math.round(audio.duration || 3), name: f.name.replace(/\.[^.]+$/, '') });
                                resolve();
                            };
                            audio.onerror = () => {
                                c.uniqueVoiceGroups[gIdx].items.push({ src: ev.target.result,
                                    duration: 3, name: f.name.replace(/\.[^.]+$/, '') });
                                resolve();
                            };
                        };
                        reader.onerror = () => resolve();
                        reader.readAsDataURL(f);
                    });
                });
                await Promise.all(promises);
                await updateContact(c);
                window.renderExclusiveVoiceGroups(cid);
                showToast(`上传 ${files.length} 个语音文件 ✅`);
                input.value = '';
            };
            window.batchExclusiveVI = async (cid, gIdx) => {
                const textarea = document.getElementById(`ev-batch-${cid}-${gIdx}`);
                const lines = textarea?.value?.split('\n').map(l => l.trim()).filter(l => l) || [];
                if (!lines.length) return;
                const c = contacts.find(cc => cc.id === cid);
                if (!c?.uniqueVoiceGroups) return;
                if (!c.uniqueVoiceGroups[gIdx]) return;
                lines.forEach(line => {
                    const parts = line.split('|');
                    if (parts.length >= 2) {
                        c.uniqueVoiceGroups[gIdx].items.push({ name: parts[0].trim(), src: parts[1]
                                .trim(), duration: parseFloat(parts[2]) || 3 });
                    }
                });
                await updateContact(c);
                window.renderExclusiveVoiceGroups(cid);
                textarea.value = '';
                showToast('导入成功 ✅');
            };

            function openSubPage(p) {
                document.getElementById('settings-home').style.display = 'none';
                const sub = document.getElementById('settings-subpages');
                sub.classList.remove('hidden');
                sub.innerHTML =
                    '<div class="panel-header"><button id="back-to-settings" class="text-[var(--text-secondary)]"><i class="fa fa-arrow-left text-lg"></i></button><h2 class="font-semibold text-lg text-[var(--text-primary)]"></h2><div></div></div><div class="panel-body" id="sub-content"></div>';
                const c = document.getElementById('sub-content');
                document.getElementById('back-to-settings').addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    sub.classList.add('hidden');
                    const home = document.getElementById('settings-home');
                    home.classList.remove('hidden');
                    home.style.display = '';
                });
                if (p === 'contacts') {
                    document.querySelector('#settings-subpages h2').textContent = '👥 联系人管理';
                    c.innerHTML =
                        `<button id="add-contact-in-settings" class="w-full py-3 border border-dashed border-[var(--border-color)] rounded-xl text-sm mb-4">+ 新建联系人</button><label for="contact-bg-upload" class="block w-full py-3 border border-dashed border-[var(--border-color)] rounded-xl text-sm text-center cursor-pointer mb-4">🖼 为当前联系人设置专属背景</label><input type="file" id="contact-bg-upload" accept="image/*" class="hidden"><div id="settings-contact-list" class="space-y-2"></div>`;
                    renderSettingsContactList();
                    document.getElementById('contact-bg-upload').onchange = e => { const f = e.target.files[0]; if (!
                            f) return; const contact = getCurrentContact(); if (!contact) return;
                        compressImage(f, 1920, 0.88).then(src => {
                            if (!src) return;
                            contact.bgImage = src;
                            updateContact(contact);
                            updateChatBackground();
                            showToast('当前联系人背景已更新 ✅');
                        });
                        e.target.value = ''; };
                    document.getElementById('add-contact-in-settings').onclick = async () => { const name = prompt(
                            '输入联系人昵称'); if (name?.trim()) { const nc = await addContact({ name: name.trim() });
                            renderSettingsContactList();
                            await switchContact(nc.id); } };
                } else if (p === 'appearance') {
                    document.querySelector('#settings-subpages h2').textContent = '🎨 外观皮肤';
                    const frameOpts = ['none', 'glow', 'thin', 'double', 'rainbow'];
                    const frameLabels = { none: '无', glow: '💫 发光', thin: '细边', double: '双层', rainbow: '🌈 彩虹' };
                    c.innerHTML =
                        `<div class="space-y-3 text-sm"><div class="flex justify-between"><span>主题色</span><input type="color" id="theme-color" value="${settings.themeColor}" class="w-8 h-8 rounded border p-0.5"></div><div class="flex justify-between"><span>气泡(我)</span><input type="color" id="bubble-me-color" value="${settings.bubbleMeColor}" class="w-8 h-8 rounded border p-0.5"></div><div class="flex justify-between"><span>气泡(TA)</span><input type="color" id="bubble-you-color" value="${settings.bubbleYouColor}" class="w-8 h-8 rounded border p-0.5"></div><div class="flex justify-between"><span>圆角</span><input type="range" id="radius-slider" min="4" max="30" value="${settings.borderRadius}" class="w-24"><span id="radius-val">${settings.borderRadius}px</span></div><div class="flex justify-between"><span>日夜</span><input type="checkbox" id="darkmode-toggle" ${settings.darkMode?'checked':''}></div><hr class="border-[var(--border-color)]"><div class="flex justify-between"><span>💫 头像流光</span><input type="checkbox" id="avatar-flow-toggle" ${settings.avatarFlow?'checked':''}></div><div class="flex justify-between"><span>⬜ 方形头像</span><input type="checkbox" id="avatar-square-toggle" ${settings.avatarSquare?'checked':''}></div><div class="flex justify-between"><span>🎈 头像悬浮</span><input type="checkbox" id="avatar-float-toggle" ${settings.avatarFloat?'checked':''}></div><div class="flex justify-between"><span>🖼️ 头像框</span><select id="avatar-frame-select" class="text-sm border rounded px-2 py-1">${frameOpts.map(v => `<option value="${v}" ${settings.avatarFrame === v ? 'selected' : ''}>${frameLabels[v]}</option>`).join('')}</select></div><div class="flex flex-col"><span class="text-xs text-[var(--text-secondary)]">🎨 头像框自定义CSS</span><textarea id="avatar-custom-css-input" rows="3" class="w-full px-3 py-2 border rounded-lg text-xs font-mono resize-y mt-1" placeholder="box-shadow: 0 0 20px #ff6b9d; border: 3px solid gold; border-radius: 50%;">${escapeHtml(settings.avatarCustomCSS || '')}</textarea></div><hr class="border-[var(--border-color)]"><details class="text-sm" ${settings.customCSS ? 'open' : ''}><summary class="cursor-pointer text-[var(--text-secondary)] mb-1">✏️ 自定义 CSS</summary><textarea id="custom-css-input" rows="8" class="w-full px-3 py-2 border rounded-lg text-xs font-mono resize-y mt-2" placeholder="body { background: #fff; }&#10;.message-bubble-left { border-radius: 12px; }">${escapeHtml(settings.customCSS || '')}</textarea><p class="text-xs text-[var(--text-secondary)] mt-1">写任何 CSS 样式，保存后即时生效</p></details></div>`;
                    document.getElementById('theme-color').oninput = e => { settings.themeColor = e.target.value;
                        applySkin();
                        saveSettings(); };
                    document.getElementById('bubble-me-color').oninput = e => { settings.bubbleMeColor = e.target
                            .value;
                        applySkin();
                        saveSettings(); };
                    document.getElementById('bubble-you-color').oninput = e => { settings.bubbleYouColor = e.target
                            .value;
                        applySkin();
                        saveSettings(); };
                    document.getElementById('radius-slider').oninput = e => { settings.borderRadius = parseInt(e
                            .target.value);
                        document.getElementById('radius-val').textContent = settings.borderRadius + 'px';
                        applySkin();
                        saveSettings(); };
                    document.getElementById('darkmode-toggle').onchange = e => { settings.darkMode = e.target.checked;
                        applySkin();
                        saveSettings(); };
                    setTimeout(function() {
                        var af = document.getElementById('avatar-flow-toggle');
                        var as = document.getElementById('avatar-square-toggle');
                        var afl = document.getElementById('avatar-float-toggle');
                        if (af) af.onchange = function(e) { settings.avatarFlow = e.target.checked; applyAvatarEffects(); saveSettings(); };
                        if (as) as.onchange = function(e) { settings.avatarSquare = e.target.checked; applyAvatarEffects(); saveSettings(); };
                        if (afl) afl.onchange = function(e) { settings.avatarFloat = e.target.checked; applyAvatarEffects(); saveSettings(); };
                        var aFrm = document.getElementById('avatar-frame-select');
                        if (aFrm) aFrm.onchange = function(e) { settings.avatarFrame = e.target.value; applyAvatarEffects(); saveSettings(); };
                        var ccInput = document.getElementById('custom-css-input');
                        if (ccInput) ccInput.oninput = function(e) { settings.customCSS = e.target.value; applyCustomCSS(); saveSettings(); };
                        var accInput = document.getElementById('avatar-custom-css-input');
                        if (accInput) accInput.oninput = function(e) { settings.avatarCustomCSS = e.target.value; applyAvatarEffects(); saveSettings(); };
                    }, 50);
                } else if (p === 'background') {
                    document.querySelector('#settings-subpages h2').textContent = '🖼️ 聊天背景';
                    c.innerHTML =
                        `<label for="bg-image-upload" class="block py-3 bg-[var(--theme-light)] rounded-xl text-center text-sm cursor-pointer mb-3">📁 上传背景图片</label><input type="file" id="bg-image-upload" accept="image/*" class="hidden"><div class="flex justify-between text-sm mb-2"><span>模糊度</span><input type="range" id="bg-blur" min="0" max="30" value="${settings.bgBlur}" class="w-24"><span id="blur-val">${settings.bgBlur}px</span></div><div class="flex justify-between text-sm mb-2"><span>透明度</span><input type="range" id="bg-opacity" min="0" max="100" value="${Math.round(settings.bgOpacity*100)}" class="w-24"><span id="opacity-val">${Math.round(settings.bgOpacity*100)}%</span></div><hr class="my-4 border-[var(--border-color)]"><div class="flex justify-between"><span>开启动态效果</span><input type="checkbox" id="bg-effects-enabled" class="effect-checkbox" ${settings.bgEffects.enabled?'checked':''}></div><button id="clear-bg-btn" class="w-full py-2 bg-red-50 text-red-500 rounded-xl text-sm mt-4">清除背景</button>`;
                    document.getElementById('bg-image-upload').onchange = e => { const f = e.target.files[0]; if (!
                            f) return;
                        compressImage(f, 1920, 0.88).then(src => {
                            if (!src) return;
                            settings.bgImage = src;
                            applySkin();
                            saveSettings();
                            showToast('背景上传成功 ✅');
                        });
                        e.target.value = ''; };
                    document.getElementById('bg-blur').oninput = e => { settings.bgBlur = parseInt(e.target.value);
                        document.getElementById('blur-val').textContent = settings.bgBlur + 'px';
                        applySkin();
                        saveSettings(); };
                    document.getElementById('bg-opacity').oninput = e => { settings.bgOpacity = parseInt(e.target
                            .value) / 100;
                        document.getElementById('opacity-val').textContent = e.target.value + '%';
                        applySkin();
                        saveSettings(); };
                    document.getElementById('bg-effects-enabled').onchange = e => { settings.bgEffects.enabled = e
                            .target.checked;
                        applySkin();
                        saveSettings(); };
                    document.getElementById('clear-bg-btn').onclick = () => { settings.bgImage = '';
                        settings.bgBlur = 0;
                        settings.bgOpacity = 1;
                        applySkin();
                        saveSettings();
                        showToast('背景已清除'); };
                } else if (p === 'wordcards') {
                    document.querySelector('#settings-subpages h2').textContent = '📝 字卡管理';
                    c.innerHTML = `
                <div class="flex space-x-2 mb-3">
                  <button id="export-all-shared-wordcards" class="flex-1 py-2 bg-[var(--theme-light)] rounded-lg text-sm text-[var(--text-primary)]">
                    <i class="fa fa-download mr-1"></i>导出全部共用字卡
                  </button>
                  <label class="flex-1 py-2 bg-[var(--theme-light)] rounded-lg text-sm text-[var(--text-primary)] text-center cursor-pointer">
                    <i class="fa fa-upload mr-1"></i>导入共用字卡
                    <input type="file" id="import-all-shared-wordcards" accept=".json" class="hidden">
                  </label>
                </div>
                <div id="word-card-groups" class="space-y-2 mb-3"></div>
                <button id="add-group-btn" class="w-full py-2 border border-dashed border-[var(--border-color)] rounded-xl text-sm">+ 添加分组</button>
              `;
                    renderWordCardGroups();
                    document.getElementById('add-group-btn').onclick = async () => { const n = prompt('分组名称'); if (
                            n?.trim()) { const g = { name: n.trim(), cards: [], enabled: true, blockedCards: [] };
                            const id = await addData('wordCards', g);
                            g.id = id;
                            wordCardGroups.push(g);
                            renderWordCardGroups(); } };
                    document.getElementById('export-all-shared-wordcards').addEventListener('click', (e) => {
                        e.stopPropagation();
                        const data = {
                            type: 'shared-wordcards-all',
                            exportTime: new Date().toISOString(),
                            groups: wordCardGroups.map(g => ({
                                name: g.name,
                                enabled: g.enabled,
                                cards: g.cards,
                                blockedCards: g.blockedCards || []
                            }))
                        };
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `LOVE_共用字卡_全部_${new Date().toISOString().slice(0,10)}.json`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                        showToast('导出成功 ✅');
                    });
                    document.getElementById('import-all-shared-wordcards').addEventListener('change', async (e) => {
                        e.stopPropagation();
                        const file = e.target.files[0];
                        if (!file) return;
                        const mode = confirm('点击"确定"选择【覆盖导入】（清空所有共用分组，用文件替换）\n点击"取消"选择【追加导入】（保留现有分组，合并字卡去重）');
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                            try {
                                const data = JSON.parse(ev.target.result);
                                if (data.type !== 'shared-wordcards-all') {
                                    showToast('文件格式错误：不是共用字卡导出文件');
                                    return;
                                }
                                if (!data.groups || !Array.isArray(data.groups)) {
                                    showToast('文件格式错误：缺少 groups 数组');
                                    return;
                                }
                                if (mode) {
                                    if (!confirm(`确定清空所有共用分组，用文件中的 ${data.groups.length} 个分组替换吗？`)) {
                                        e.target.value = '';
                                        return;
                                    }
                                    for (const g of wordCardGroups) {
                                        await deleteData('wordCards', g.id);
                                    }
                                    wordCardGroups = [];
                                    for (const gData of data.groups) {
                                        const newGroup = {
                                            name: gData.name,
                                            cards: gData.cards || [],
                                            enabled: gData.enabled !== undefined ? gData.enabled : true,
                                            blockedCards: gData.blockedCards || []
                                        };
                                        const id = await addData('wordCards', newGroup);
                                        newGroup.id = id;
                                        wordCardGroups.push(newGroup);
                                    }
                                    renderWordCardGroups();
                                    showToast(`覆盖导入完成：导入 ${data.groups.length} 个分组 ✅`);
                                } else {
                                    let addedGroups = 0;
                                    let addedCards = 0;
                                    for (const gData of data.groups) {
                                        const existing = wordCardGroups.find(g => g.name === gData.name);
                                        if (existing) {
                                            const cardSet = new Set(existing.cards);
                                            const blockedSet = new Set(existing.blockedCards || []);
                                            let cardsAdded = 0;
                                            for (const card of (gData.cards || [])) {
                                                if (!cardSet.has(card)) {
                                                    existing.cards.push(card);
                                                    cardSet.add(card);
                                                    cardsAdded++;
                                                }
                                            }
                                            for (const card of (gData.blockedCards || [])) {
                                                if (!blockedSet.has(card)) {
                                                    if (!existing.blockedCards) existing.blockedCards = [];
                                                    existing.blockedCards.push(card);
                                                    blockedSet.add(card);
                                                }
                                            }
                                            if (cardsAdded > 0) {
                                                await updateData('wordCards', existing);
                                                addedCards += cardsAdded;
                                            }
                                        } else {
                                            const newGroup = {
                                                name: gData.name,
                                                cards: gData.cards || [],
                                                enabled: gData.enabled !== undefined ? gData.enabled : true,
                                                blockedCards: gData.blockedCards || []
                                            };
                                            const id = await addData('wordCards', newGroup);
                                            newGroup.id = id;
                                            wordCardGroups.push(newGroup);
                                            addedGroups++;
                                            addedCards += (gData.cards || []).length;
                                        }
                                    }
                                    renderWordCardGroups();
                                    showToast(`追加导入完成：新增 ${addedGroups} 个分组，合并 ${addedCards} 张字卡 ✅`);
                                }
                            } catch (err) {
                                showToast('导入失败：' + err.message);
                            }
                        };
                        reader.readAsText(file);
                        e.target.value = '';
                    });
                } else if (p === 'status') {
                    document.querySelector('#settings-subpages h2').textContent = '💬 全局状态库';
                    c.innerHTML =
                        `<div id="status-list" class="space-y-1 mb-2 max-h-32 overflow-y-auto"></div><button id="add-status-btn" class="w-full py-2 border border-dashed border-[var(--border-color)] rounded-xl text-sm mb-2">+ 添加</button><div class="flex items-center space-x-1 text-xs mb-2"><span>间隔</span><input type="number" id="status-min" min="1" value="${settings.statusMin}" class="w-12 px-1 py-1 border rounded text-center">~<input type="number" id="status-max" min="1" value="${settings.statusMax}" class="w-12 px-1 py-1 border rounded text-center"><span>分</span></div><textarea id="batch-status-input" rows="2" placeholder="批量导入（每行一个）" class="w-full px-2 py-1 border border-[var(--border-color)] rounded text-xs resize-none mb-1"></textarea><button id="batch-status-btn" class="w-full py-1.5 text-white rounded-lg text-xs" style="background:var(--theme)">批量导入</button>`;
                    renderStatusList();
                    document.getElementById('add-status-btn').onclick = async () => { const t = prompt('状态'); if (t
                            ?.trim()) { settings.statusLibrary.push(t.trim());
                            saveSettings();
                            renderStatusList();
                            startStatusTimersForAll(); } };
                    document.getElementById('batch-status-btn').onclick = async () => { const txt = document
                            .getElementById('batch-status-input').value.trim(); if (!txt) return; const lines =
                            txt.split('\n').map(l => l.trim()).filter(l => l); const set = new Set(settings
                                .statusLibrary);
                        lines.forEach(l => { if (!set.has(l)) { settings.statusLibrary.push(l);
                                set.add(l); } });
                        saveSettings();
                        renderStatusList();
                        document.getElementById('batch-status-input').value = ''; };
                    document.getElementById('status-min').onchange = e => { settings.statusMin = parseInt(e.target
                            .value) || 5;
                        saveSettings(); };
                    document.getElementById('status-max').onchange = e => { settings.statusMax = parseInt(e.target
                            .value) || 60;
                        saveSettings(); };
                } else if (p === 'pat') {

                    document.querySelector('#settings-subpages h2').textContent = '👋 全局拍一拍管理';
                    c.innerHTML =
                        `<div class="space-y-6"><div><h3 class="text-sm font-semibold mb-2">我的拍一拍</h3><div class="flex items-center justify-between text-sm mb-2"><span>冷却时间(秒)</span><input type="number" id="pat-cooldown-setting" min="1" value="${settings.patCooldown}" class="w-14 px-2 py-1 border rounded-lg text-center"></div><div id="my-pat-list" class="space-y-1 mb-2 max-h-32 overflow-y-auto"></div><div class="flex space-x-1"><input type="text" id="my-pat-input-setting" placeholder="添加" class="flex-1 px-2 py-1 border rounded text-sm"><button id="add-my-pat-btn" class="px-2 py-1 text-white rounded text-sm" style="background:var(--theme)">+</button></div><textarea id="batch-my-pat" rows="2" placeholder="批量导入（每行一个）" class="w-full px-2 py-1 border rounded text-xs mt-1 resize-none"></textarea><button id="batch-my-pat-btn" class="w-full py-1 text-white rounded text-xs mt-1" style="background:var(--theme)">导入并去重</button></div><div><h3 class="text-sm font-semibold mb-2">对方的拍一拍库（分组管理）</h3><div id="partner-pat-groups" class="space-y-3"></div><button id="add-partner-pat-group-btn" class="w-full py-2 border border-dashed border-[var(--border-color)] rounded-xl text-sm">+ 添加分组</button></div></div>`;
                    renderPatSettings();
                    document.getElementById('pat-cooldown-setting').onchange = e => { settings.patCooldown = parseInt(
                            e.target.value) || 5;
                        saveSettings(); };
                    document.getElementById('add-my-pat-btn').onclick = () => { const t = document.getElementById(
                            'my-pat-input-setting').value.trim(); if (t && !settings.patLibrary.includes(t)) {
                            settings.patLibrary.push(t);
                            saveSettings();
                            renderPatSettings();
                            renderPatDrawer(); } };
                    document.getElementById('batch-my-pat-btn').onclick = () => { const txt = document.getElementById(
                            'batch-my-pat').value.trim(); if (!txt) return; const lines = txt.split('\n').map(l =>
                            l.trim()).filter(l => l); const set = new Set(settings.patLibrary);
                        lines.forEach(l => { if (!set.has(l)) { settings.patLibrary.push(l);
                                set.add(l); } });
                        saveSettings();
                        renderPatSettings();
                        renderPatDrawer(); };
                    document.getElementById('add-partner-pat-group-btn').onclick = async () => { const n = prompt(
                            '分组名称'); if (n?.trim()) { if (!settings.partnerPatGroups) settings
                                .partnerPatGroups = [];
                            settings.partnerPatGroups.push({ name: n.trim(), items: [], enabled: true });
                            saveSettings();
                            renderPatSettings(); } };
                } else if (p === 'contact-exclusive') {
                    document.querySelector('#settings-subpages h2').textContent = '🎭 联系人专属管理';
                    c.innerHTML =
                        `<div class="mb-4"><label class="text-sm text-[var(--text-secondary)]">选择联系人</label><select id="exclusive-contact-select" class="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-sm mt-1"><option value="">请选择联系人</option>${contacts.map(ct => `<option value="${ct.id}">${escapeHtml(ct.name)}</option>`).join('')}</select></div><div id="exclusive-content-area" class="hidden"><div class="flex border-b border-[var(--border-color)] mb-3"><button class="exclusive-tab active flex-1 py-2 text-sm font-medium text-center border-b-2" data-tab="ex-wordcards" style="color:var(--theme);border-color:var(--theme);">专属字卡</button><button class="exclusive-tab flex-1 py-2 text-sm font-medium text-center text-[var(--text-secondary)]" data-tab="ex-emojis">专属表情包</button><button class="exclusive-tab flex-1 py-2 text-sm font-medium text-center text-[var(--text-secondary)]" data-tab="ex-voices">专属语音</button></div><div id="ex-wordcards-panel"><div id="ex-wordcard-groups" class="space-y-3"></div><button id="add-exclusive-wordcard-group-btn" class="w-full py-2 border border-dashed border-[var(--border-color)] rounded-xl text-sm mt-4">+ 添加专属字卡分组</button></div><div id="ex-emojis-panel" class="hidden"><div id="ex-emoji-list" class="grid grid-cols-5 gap-2 mb-3"></div><label for="ex-emoji-upload" class="block py-2 bg-[var(--theme-light)] rounded-lg text-center cursor-pointer text-sm mb-2">📷 上传表情包（可多选）</label><input type="file" id="ex-emoji-upload" accept="image/*" multiple class="hidden"><button id="clear-ex-emojis-btn" class="w-full py-2 bg-red-50 text-red-500 rounded-xl text-sm mt-2">清空专属表情包</button></div><div id="ex-voices-panel" class="hidden"><div id="ex-voice-list" class="space-y-2 mb-3"></div><div class="flex border-b border-[var(--border-color)] mb-3"><button class="ex-voice-tab active flex-1 py-2 text-xs font-medium text-center border-b-2" data-vtab="voice-groups" style="color:var(--theme);border-color:var(--theme);">语音分组</button><button class="ex-voice-tab flex-1 py-2 text-xs font-medium text-center text-[var(--text-secondary)]" data-vtab="voice-record">录音录入</button></div><div id="voice-groups-panel"><div id="ex-voice-groups" class="space-y-3"></div><button id="add-exclusive-voice-group-btn" class="w-full py-2 border border-dashed border-[var(--border-color)] rounded-xl text-sm mt-4">+ 添加语音分组</button></div><div id="voice-record-panel" class="hidden"><div class="text-center py-4"><button id="start-voice-record-btn" class="px-6 py-3 rounded-full text-white text-lg" style="background:var(--theme)"><i class="fa fa-microphone mr-2"></i>开始录音</button><p id="voice-record-status" class="text-xs text-[var(--text-secondary)] mt-2"></p><audio id="voice-record-preview" class="hidden mt-2 w-full" controls></audio><div class="flex space-x-2 mt-3 hidden" id="voice-save-btns"><input type="text" id="new-voice-name" placeholder="语音名称" class="flex-1 px-2 py-1 border rounded text-sm"><button id="save-recorded-voice-btn" class="px-4 py-1 text-white rounded text-sm" style="background:var(--theme)">保存</button></div></div></div></div></div>`;
                    const contactSelect = document.getElementById('exclusive-contact-select');
                    const contentArea = document.getElementById('exclusive-content-area');
                    const tabs = document.querySelectorAll('.exclusive-tab');
                    const wordcardsPanel = document.getElementById('ex-wordcards-panel');
                    const emojisPanel = document.getElementById('ex-emojis-panel');
                    const voicesPanel = document.getElementById('ex-voices-panel');
                    contactSelect.onchange = () => { const cid = parseInt(contactSelect.value); if (!cid) { contentArea
                                .classList.add('hidden'); return; }
                        contentArea.classList.remove('hidden');
                        window.renderExclusiveWordCardGroups(cid);
                        window.renderExclusiveEmojiList(cid);
                        window.renderExclusiveVoiceGroups(cid); };
                    tabs.forEach(tab => { tab.onclick = () => { tabs.forEach(t => { t.style.color =
                                'var(--text-secondary)';
                                t.style.borderColor = 'transparent'; });
                            tab.style.color = 'var(--theme)';
                            tab.style.borderColor = 'var(--theme)';
                            wordcardsPanel.classList.add('hidden');
                            emojisPanel.classList.add('hidden');
                            voicesPanel.classList.add('hidden'); if (tab.dataset.tab === 'ex-wordcards')
                                wordcardsPanel.classList.remove('hidden');
                            else if (tab.dataset.tab === 'ex-emojis') emojisPanel.classList.remove('hidden');
                            else voicesPanel.classList.remove('hidden'); }; });
                    const vTabs = document.querySelectorAll('.ex-voice-tab');
                    const vGroupsPanel = document.getElementById('voice-groups-panel');
                    const vRecordPanel = document.getElementById('voice-record-panel');
                    vTabs.forEach(vt => { vt.onclick = () => { vTabs.forEach(t => { t.style.color =
                                    'var(--text-secondary)';
                                    t.style.borderColor = 'transparent'; });
                                vt.style.color = 'var(--theme)';
                                vt.style.borderColor = 'var(--theme)';
                                vGroupsPanel.classList.add('hidden');
                                vRecordPanel.classList.add('hidden'); if (vt.dataset.vtab === 'voice-groups')
                                    vGroupsPanel.classList.remove('hidden');
                                else vRecordPanel.classList.remove('hidden'); }; });
                    document.getElementById('add-exclusive-wordcard-group-btn').onclick = async () => { const cid =
                            parseInt(contactSelect.value); if (!cid) return; const name = prompt('分组名称'); if (!
                                name?.trim()) return; const contact = contacts.find(c => c.id === cid); if (!
                                contact) return; if (!contact.uniqueWordCardGroups) contact
                                .uniqueWordCardGroups = [];
                            contact.uniqueWordCardGroups.push({ name: name.trim(), cards: [], enabled: true,
                                blockedCards: [] });
                            await updateContact(contact);
                            window.renderExclusiveWordCardGroups(cid); };
                    document.getElementById('ex-emoji-upload').onchange = async (e) => { const cid = parseInt(
                            contactSelect.value); const contact = contacts.find(c => c.id === cid); if (!
                                contact) return; if (!contact.uniqueEmojis) contact.uniqueEmojis = []; const
                            files = e.target.files; if (!files.length) return; let count = 0;
                        Array.from(files).forEach(f => {
                            compressImage(f, 512, 0.9).then(src => {
                                if (!src) { count++; if (count === files.length) { e.target.value = ''; } return; }
                                contact.uniqueEmojis.push({ src });
                                count++; if (count === files.length) { updateContact(contact);
                                    window.renderExclusiveEmojiList(cid);
                                    showToast('上传成功 ✅'); }
                            });
                        });
                        e.target.value = ''; };
                    document.getElementById('clear-ex-emojis-btn').onclick = async () => { const cid = parseInt(
                            contactSelect.value); const contact = contacts.find(c => c.id === cid); if (!
                                contact || !confirm('确定清空？')) return;
                        contact.uniqueEmojis = [];
                        await updateContact(contact);
                        window.renderExclusiveEmojiList(cid); };
                    document.getElementById('add-exclusive-voice-group-btn').onclick = async () => { const cid =
                            parseInt(contactSelect.value); if (!cid) return; const name = prompt('分组名称'); if (!
                                name?.trim()) return; const contact = contacts.find(c => c.id === cid); if (!
                                contact) return; if (!contact.uniqueVoiceGroups) contact.uniqueVoiceGroups = [];
                            contact.uniqueVoiceGroups.push({ name: name.trim(), items: [], enabled: true });
                            await updateContact(contact);
                            window.renderExclusiveVoiceGroups(cid); };
                    let voiceRecorder = null,
                        voiceChunks = [],
                        voiceRecStream = null;
                    document.getElementById('start-voice-record-btn').onclick = async () => {
                        const btn = document.getElementById('start-voice-record-btn');
                        if (voiceRecorder && voiceRecorder.state === 'recording') {
                            voiceRecorder.stop();
                            btn.innerHTML = '<i class="fa fa-microphone mr-2"></i>开始录音';
                            document.getElementById('voice-record-status').textContent = '录音已停止';
                            return;
                        }
                        if (!navigator.mediaDevices?.getUserMedia) { showToast('浏览器不支持录音'); return; }
                        try {
                            voiceRecStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                            voiceChunks = [];
                            voiceRecorder = new MediaRecorder(voiceRecStream, { mimeType: 'audio/webm' });
                            voiceRecorder.ondataavailable = e => { if (e.data.size > 0) voiceChunks.push(e
                                    .data); };
                            voiceRecorder.onstop = () => {
                                if (voiceRecStream) voiceRecStream.getTracks().forEach(t => t.stop());
                                const blob = new Blob(voiceChunks, { type: 'audio/webm' });
                                const url = URL.createObjectURL(blob);
                                const preview = document.getElementById('voice-record-preview');
                                preview.src = url;
                                preview.classList.remove('hidden');
                                document.getElementById('voice-save-btns').classList.remove('hidden');
                                document.getElementById('voice-record-status').textContent = '录音完成，可试听并保存';
                            };
                            voiceRecorder.start();
                            btn.innerHTML = '<i class="fa fa-stop mr-2"></i>停止录音';
                            document.getElementById('voice-record-status').textContent = '正在录音...';
                            document.getElementById('voice-save-btns').classList.add('hidden');
                            document.getElementById('voice-record-preview').classList.add('hidden');
                        } catch (err) { showToast('无法获取麦克风权限'); }
                    };
                    document.getElementById('save-recorded-voice-btn').onclick = async () => {
                        const cid = parseInt(contactSelect.value);
                        const contact = contacts.find(c => c.id === cid);
                        const name = document.getElementById('new-voice-name').value.trim();
                        if (!contact || !name) { showToast('请输入语音名称'); return; }
                        const preview = document.getElementById('voice-record-preview');
                        if (!preview.src) { showToast('请先录音'); return; }
                        const blob = await fetch(preview.src).then(r => r.blob());
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                            if (!contact.uniqueVoiceGroups) contact.uniqueVoiceGroups = [{ name: '默认',
                                items: [], enabled: true }];
                            const group = contact.uniqueVoiceGroups[0];
                            if (!group) { contact.uniqueVoiceGroups.push({ name: '默认', items: [],
                                    enabled: true }); }
                            const targetGroup = contact.uniqueVoiceGroups[0];
                            targetGroup.items.push({ src: ev.target.result, duration: Math.round(
                                    preview.duration || 3), name });
                            await updateContact(contact);
                            window.renderExclusiveVoiceGroups(cid);
                            document.getElementById('new-voice-name').value = '';
                            document.getElementById('voice-save-btns').classList.add('hidden');
                            document.getElementById('voice-record-preview').classList.add('hidden');
                            showToast('语音保存成功 ✅');
                        };
                        reader.readAsDataURL(blob);
                    };
                } else if (p === 'group-content') {
                    document.querySelector('#settings-subpages h2').textContent = '👥 群聊专属管理';
                    const currentGroup = getCurrentGroup();
                    c.innerHTML =
                        `<div class="mb-4"><label class="text-sm">选择群聊</label><select id="group-content-select" class="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-sm mt-1"><option value="">请选择群聊</option>${groups.map(g => `<option value="${g.id}" ${currentGroup && g.id === currentGroup.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}</select></div><div id="group-content-area" class="hidden"><label for="group-bg-upload" class="block w-full py-3 border border-dashed border-[var(--border-color)] rounded-xl text-sm text-center cursor-pointer mb-4">🖼 为当前群聊设置专属背景</label><input type="file" id="group-bg-upload" accept="image/*" class="hidden"><div class="mt-4"><label class="text-sm">群聊头像</label><div class="flex items-center space-x-2 mt-2"><img id="group-avatar-preview" src="${currentGroup?.avatar || 'https://picsum.photos/200/200?random=group'}" class="w-12 h-12 rounded-full"><label for="group-avatar-upload" class="px-3 py-1.5 bg-[var(--theme-light)] rounded-lg text-sm cursor-pointer">更换头像</label><input type="file" id="group-avatar-upload" accept="image/*" class="hidden"></div></div></div>`;
                    const groupSelect = document.getElementById('group-content-select');
                    const contentArea2 = document.getElementById('group-content-area');
                    const bgInput = document.getElementById('group-bg-upload');
                    groupSelect.onchange = () => { const gid = parseInt(groupSelect.value); if (!gid) { contentArea2
                                .classList.add('hidden'); return; }
                        contentArea2.classList.remove('hidden'); const group = groups.find(g => g.id === gid); if (
                            group) document.getElementById('group-avatar-preview').src = group.avatar ||
                            'https://picsum.photos/200/200?random=group'; };
                    if (currentGroup) { groupSelect.value = currentGroup.id;
                        contentArea2.classList.remove('hidden');
                        document.getElementById('group-avatar-preview').src = currentGroup.avatar ||
                            'https://picsum.photos/200/200?random=group'; }
                    bgInput.onchange = e => { const f = e.target.files[0]; if (!f) return; const gid = parseInt(
                            groupSelect.value); const group = groups.find(g => g.id === gid); if (!group) return;
                        compressImage(f, 1920, 0.88).then(src => {
                            if (!src) return;
                            group.bgImage = src;
                            updateData('groups', group); if (currentChatType === 'group' && currentGroupId ===
                                gid) updateChatBackground();
                            showToast('群聊背景已更新');
                        });
                        e.target.value = ''; };
                    document.getElementById('group-avatar-upload').onchange = e => { const f = e.target.files[0]; if (!
                            f) return; const gid = parseInt(groupSelect.value); const group = groups.find(g =>
                                g.id === gid); if (!group) return;
                        compressImage(f, 512, 0.9).then(src => {
                            if (!src) return;
                            group.avatar = src;
                            updateData('groups', group);
                            document.getElementById('group-avatar-preview').src = src; if (
                                currentChatType === 'group' && currentGroupId === gid) { document
                                    .getElementById('partner-avatar').src = src; }
                            renderGroupList();
                            showToast('群聊头像已更新 ✅');
                        });
                        e.target.value = ''; };
                } else if (p === 'general-voice') {
                    document.querySelector('#settings-subpages h2').textContent = '🎵 通用语音管理';
                    c.innerHTML = `
                <div class="flex space-x-2 mb-3">
                  <button id="export-all-general-voice" class="flex-1 py-2 bg-[var(--theme-light)] rounded-lg text-sm text-[var(--text-primary)]">
                    <i class="fa fa-download mr-1"></i>导出全部通用语音
                  </button>
                  <label class="flex-1 py-2 bg-[var(--theme-light)] rounded-lg text-sm text-[var(--text-primary)] text-center cursor-pointer">
                    <i class="fa fa-upload mr-1"></i>导入通用语音
                    <input type="file" id="import-all-general-voice" accept=".json" class="hidden">
                  </label>
                </div>
                <div id="general-voice-groups" class="space-y-3 mb-4"></div>
                <button id="add-general-voice-group-btn" class="w-full py-2 border border-dashed border-[var(--border-color)] rounded-xl text-sm">+ 添加语音分组</button>
                <div class="mt-4 border-t border-[var(--border-color)] pt-4"><h4 class="text-sm font-semibold mb-2">🎤 录音录入</h4><div class="text-center py-3"><button id="start-general-voice-record-btn" class="px-6 py-3 rounded-full text-white text-lg" style="background:var(--theme)"><i class="fa fa-microphone mr-2"></i>开始录音</button><p id="general-voice-record-status" class="text-xs text-[var(--text-secondary)] mt-2"></p><audio id="general-voice-record-preview" class="hidden mt-2 w-full" controls></audio><div class="flex space-x-2 mt-3 hidden" id="general-voice-save-btns"><input type="text" id="new-general-voice-name" placeholder="语音名称" class="flex-1 px-2 py-1 border rounded text-sm"><button id="save-general-recorded-voice-btn" class="px-4 py-1 text-white rounded text-sm" style="background:var(--theme)">保存到通用库</button></div></div></div>
              `;
                    renderGeneralVoiceGroups();
                    document.getElementById('export-all-general-voice').addEventListener('click', (e) => {
                        e.stopPropagation();
                        const data = {
                            type: 'general-voice-all',
                            exportTime: new Date().toISOString(),
                            groups: (settings.generalVoiceGroups || []).map(g => ({
                                name: g.name,
                                enabled: g.enabled,
                                items: g.items || []
                            }))
                        };
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `LOVE_通用语音_全部_${new Date().toISOString().slice(0,10)}.json`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                        showToast('导出成功 ✅');
                    });
                    document.getElementById('import-all-general-voice').addEventListener('change', async (e) => {
                        e.stopPropagation();
                        const file = e.target.files[0];
                        if (!file) return;
                        const mode = confirm('点击"确定"选择【覆盖导入】（清空所有通用语音分组，用文件替换）\n点击"取消"选择【追加导入】（保留现有分组，合并去重）');
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                            try {
                                const data = JSON.parse(ev.target.result);
                                if (data.type !== 'general-voice-all') {
                                    showToast('文件格式错误：不是通用语音导出文件');
                                    return;
                                }
                                if (!data.groups || !Array.isArray(data.groups)) {
                                    showToast('文件格式错误：缺少 groups 数组');
                                    return;
                                }
                                if (!settings.generalVoiceGroups) settings.generalVoiceGroups = [];
                                if (mode) {
                                    if (!confirm(`确定清空所有通用语音分组，用文件中的 ${data.groups.length} 个分组替换吗？`)) {
                                        e.target.value = '';
                                        return;
                                    }
                                    settings.generalVoiceGroups = [];
                                    for (const gData of data.groups) {
                                        settings.generalVoiceGroups.push({
                                            name: gData.name,
                                            enabled: gData.enabled !== undefined ? gData.enabled : true,
                                            items: gData.items || []
                                        });
                                    }
                                    saveSettings();
                                    renderGeneralVoiceGroups();
                                    showToast(`覆盖导入完成：导入 ${data.groups.length} 个分组 ✅`);
                                } else {
                                    let addedGroups = 0;
                                    let addedItems = 0;
                                    for (const gData of data.groups) {
                                        const existing = settings.generalVoiceGroups.find(g => g.name === gData.name);
                                        if (existing) {
                                            const srcSet = new Set(existing.items.map(item => item.src));
                                            let itemsAdded = 0;
                                            for (const item of (gData.items || [])) {
                                                if (!srcSet.has(item.src)) {
                                                    existing.items.push(item);
                                                    srcSet.add(item.src);
                                                    itemsAdded++;
                                                }
                                            }
                                            if (itemsAdded > 0) {
                                                addedItems += itemsAdded;
                                            }
                                        } else {
                                            settings.generalVoiceGroups.push({
                                                name: gData.name,
                                                enabled: gData.enabled !== undefined ? gData.enabled : true,
                                                items: gData.items || []
                                            });
                                            addedGroups++;
                                            addedItems += (gData.items || []).length;
                                        }
                                    }
                                    saveSettings();
                                    renderGeneralVoiceGroups();
                                    showToast(`追加导入完成：新增 ${addedGroups} 个分组，合并 ${addedItems} 条语音 ✅`);
                                }
                            } catch (err) {
                                showToast('导入失败：' + err.message);
                            }
                        };
                        reader.readAsText(file);
                        e.target.value = '';
                    });
                    document.getElementById('add-general-voice-group-btn').onclick = async () => { const name =
                            prompt('分组名称'); if (name?.trim()) { if (!settings.generalVoiceGroups) settings
                                .generalVoiceGroups = [];
                            settings.generalVoiceGroups.push({ name: name.trim(), items: [], enabled: true });
                            saveSettings();
                            renderGeneralVoiceGroups(); } };
                    let gvRecorder = null,
                        gvChunks = [],
                        gvStream = null;
                    document.getElementById('start-general-voice-record-btn').onclick = async () => {
                        const btn = document.getElementById('start-general-voice-record-btn');
                        if (gvRecorder && gvRecorder.state === 'recording') {
                            gvRecorder.stop();
                            btn.innerHTML = '<i class="fa fa-microphone mr-2"></i>开始录音';
                            document.getElementById('general-voice-record-status').textContent = '录音已停止';
                            return;
                        }
                        if (!navigator.mediaDevices?.getUserMedia) { showToast('浏览器不支持录音'); return; }
                        try {
                            gvStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                            gvChunks = [];
                            gvRecorder = new MediaRecorder(gvStream, { mimeType: 'audio/webm' });
                            gvRecorder.ondataavailable = e => { if (e.data.size > 0) gvChunks.push(e
                                    .data); };
                            gvRecorder.onstop = () => {
                                if (gvStream) gvStream.getTracks().forEach(t => t.stop());
                                const blob = new Blob(gvChunks, { type: 'audio/webm' });
                                const url = URL.createObjectURL(blob);
                                const preview = document.getElementById(
                                    'general-voice-record-preview');
                                preview.src = url;
                                preview.classList.remove('hidden');
                                document.getElementById('general-voice-save-btns').classList.remove(
                                'hidden');
                                document.getElementById('general-voice-record-status').textContent =
                                    '录音完成，可试听并保存';
                            };
                            gvRecorder.start();
                            btn.innerHTML = '<i class="fa fa-stop mr-2"></i>停止录音';
                            document.getElementById('general-voice-record-status').textContent = '正在录音...';
                            document.getElementById('general-voice-save-btns').classList.add('hidden');
                            document.getElementById('general-voice-record-preview').classList.add('hidden');
                        } catch (err) { showToast('无法获取麦克风权限'); }
                    };
                    document.getElementById('save-general-recorded-voice-btn').onclick = async () => {
                        const name = document.getElementById('new-general-voice-name').value.trim();
                        if (!name) { showToast('请输入语音名称'); return; }
                        const preview = document.getElementById('general-voice-record-preview');
                        if (!preview.src) { showToast('请先录音'); return; }
                        const blob = await fetch(preview.src).then(r => r.blob());
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                            if (!settings.generalVoiceGroups) settings.generalVoiceGroups = [];
                            if (settings.generalVoiceGroups.length === 0) settings.generalVoiceGroups
                                .push({ name: '默认', items: [], enabled: true });
                            const targetGroup = settings.generalVoiceGroups[0];
                            targetGroup.items.push({ src: ev.target.result, duration: Math.round(
                                    preview.duration || 3), name });
                            saveSettings();
                            renderGeneralVoiceGroups();
                            document.getElementById('new-general-voice-name').value = '';
                            document.getElementById('general-voice-save-btns').classList.add('hidden');
                            document.getElementById('general-voice-record-preview').classList.add('hidden');
                            showToast('通用语音保存成功 ✅');
                        };
                        reader.readAsDataURL(blob);
                    };
                } else if (p === 'data') {
                    document.querySelector('#settings-subpages h2').textContent = '📦 数据管理';
                    c.innerHTML =
                        `<div class="space-y-3"><div class="p-3 bg-[var(--card-bg)] rounded-xl"><h4 class="text-sm font-semibold mb-2">选择导出模块</h4><div class="space-y-2 text-sm"><label class="flex items-center"><input type="checkbox" class="export-checkbox" id="export-settings" checked> 系统设置</label><label class="flex items-center"><input type="checkbox" class="export-checkbox" id="export-contacts" checked> 联系人数据</label><label class="flex items-center"><input type="checkbox" class="export-checkbox" id="export-wordcards" checked> 字卡数据</label><label class="flex items-center"><input type="checkbox" class="export-checkbox" id="export-pat" checked> 拍一拍文案</label><label class="flex items-center"><input type="checkbox" class="export-checkbox" id="export-emojis" checked> 表情/表情包/颜文字</label><label class="flex items-center"><input type="checkbox" class="export-checkbox" id="export-messages" checked> 聊天记录</label><label class="flex items-center"><input type="checkbox" class="export-checkbox" id="export-mood" checked> 心情记录</label><label class="flex items-center"><input type="checkbox" class="export-checkbox" id="export-period" checked> 经期记录</label><label class="flex items-center"><input type="checkbox" class="export-checkbox" id="export-letters" checked> 信件记录</label><label class="flex items-center"><input type="checkbox" class="export-checkbox" id="export-statuses" checked> 状态库</label><label class="flex items-center"><input type="checkbox" class="export-checkbox" id="export-posts" checked> 朋友圈数据</label><label class="flex items-center"><input type="checkbox" class="export-checkbox" id="export-general-voice" checked> 通用语音库</label></div><button id="export-selected-btn" class="w-full mt-2 py-2 rounded-lg text-sm export-btn">导出选中项</button></div><button id="export-all-btn" class="w-full py-3 text-white rounded-xl text-sm" style="background:var(--theme)"><i class="fa fa-download mr-2"></i>导出全部数据</button><div class="p-3 bg-[var(--card-bg)] rounded-xl"><h4 class="text-sm font-semibold mb-2">导入数据</h4><label class="block w-full py-2 rounded-lg text-sm import-btn text-center cursor-pointer">选择文件导入<input type="file" id="import-all" accept=".json" class="hidden"></label></div><hr class="my-3 border-[var(--border-color)]"><div class="p-3 bg-[var(--card-bg)] rounded-xl"><h4 class="text-sm font-semibold mb-2">💬 聊天记录管理</h4><div class="flex space-x-2 mb-2"><button id="export-chat-records-btn" class="flex-1 py-2 rounded-lg text-sm export-btn">导出聊天记录</button><label class="flex-1 py-2 rounded-lg text-sm import-btn text-center cursor-pointer">导入聊天记录<input type="file" id="import-chat-records" accept=".json" class="hidden"></label></div><button id="clear-chat-records-btn" class="w-full py-2 bg-red-50 text-red-500 rounded-xl text-sm">清空聊天记录</button></div><button id="clear-all-data-btn" class="w-full py-3 bg-red-50 text-red-500 rounded-xl text-sm"><i class="fa fa-trash mr-2"></i>清除所有数据</button></div>`;
                    setupImportExportEvents();
                }
                document.getElementById('back-to-settings').addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    sub.classList.add('hidden');
                    const home = document.getElementById('settings-home');
                    home.classList.remove('hidden');
                    home.style.display = '';
                });
            }

            function renderGeneralVoiceGroups() {
                const container = document.getElementById('general-voice-groups');
                if (!container) return;
                container.innerHTML = '';
                if (!settings.generalVoiceGroups || settings.generalVoiceGroups.length === 0) {
                    container.innerHTML =
                        '<p class="text-xs text-center py-4 text-[var(--text-secondary)]">暂无通用语音分组</p>';
                    return;
                }
                settings.generalVoiceGroups.forEach((grp, gIdx) => {
                    const div = document.createElement('div');
                    div.className = 'border border-[var(--border-color)] rounded-xl p-3 mb-2';
                    div.innerHTML = `
                <div class="flex items-center justify-between mb-2"><input type="checkbox" ${grp.enabled?'checked':''} onchange="window.toggleGeneralVG(${gIdx},this.checked)"><span class="font-medium text-sm">${escapeHtml(grp.name)}</span><button onclick="window.deleteGeneralVG(${gIdx})" class="text-red-400 text-xs">删除分组</button></div>
                <div class="space-y-1">${grp.items.map((item,i)=>`<div class="flex items-center justify-between bg-[var(--card-bg)] rounded px-2 py-1 text-xs"><span class="truncate flex-1">🎵 ${escapeHtml(item.name||'语音'+i)} (${Math.round(item.duration||3)}秒)</span><div class="flex space-x-1"><button onclick="window.playGeneralVoice('${item.src.replace(/'/g,"\\'")}')" class="text-[var(--theme)]"><i class="fa fa-play"></i></button><button onclick="window.deleteGeneralVI(${gIdx},${i})" class="text-red-400"><i class="fa fa-trash"></i></button></div></div>`).join('')}</div>
                <div class="mt-2"><label class="block w-full py-1.5 bg-[var(--theme-light)] rounded text-center cursor-pointer text-xs">📁 上传音频文件<input type="file" accept="audio/*" class="hidden" onchange="window.uploadGeneralVoice(${gIdx},this)"></label></div>
                <textarea placeholder="批量导入base64（每行一条：名称|base64数据|秒数）" class="w-full px-2 py-1 border rounded text-xs resize-none mt-1" id="gv-batch-${gIdx}"></textarea>
                <button onclick="window.batchGeneralVI(${gIdx})" class="w-full py-1 text-white rounded text-xs mt-1" style="background:var(--theme)">批量导入</button>`;
                    container.appendChild(div);
                });
            }

            window.toggleGeneralVG = (gIdx, enabled) => { if (settings.generalVoiceGroups) { settings.generalVoiceGroups[
                        gIdx].enabled = enabled;
                    saveSettings(); } };
            window.deleteGeneralVG = (gIdx) => { if (settings.generalVoiceGroups && confirm('删除分组？')) { settings
                        .generalVoiceGroups.splice(gIdx, 1);
                    saveSettings();
                    renderGeneralVoiceGroups(); } };
            window.deleteGeneralVI = (gIdx, i) => { if (settings.generalVoiceGroups) { settings.generalVoiceGroups[gIdx]
                        .items.splice(i, 1);
                    saveSettings();
                    renderGeneralVoiceGroups(); } };
            window.playGeneralVoice = (src) => { const audio = new Audio(src);
                audio.play().catch(() => showToast('播放失败')); };
            window.uploadGeneralVoice = async (gIdx, input) => {
                const files = input.files;
                if (!files.length) return;
                if (!settings.generalVoiceGroups) settings.generalVoiceGroups = [];
                if (!settings.generalVoiceGroups[gIdx]) return;
                const promises = Array.from(files).map(f => {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            const audio = new Audio(ev.target.result);
                            audio.onloadedmetadata = () => {
                                settings.generalVoiceGroups[gIdx].items.push({ src: ev.target.result,
                                    duration: Math.round(audio.duration || 3), name: f.name.replace(/\.[^.]+$/, '') });
                                resolve();
                            };
                            audio.onerror = () => {
                                settings.generalVoiceGroups[gIdx].items.push({ src: ev.target.result,
                                    duration: 3, name: f.name.replace(/\.[^.]+$/, '') });
                                resolve();
                            };
                        };
                        reader.onerror = () => resolve();
                        reader.readAsDataURL(f);
                    });
                });
                await Promise.all(promises);
                saveSettings();
                renderGeneralVoiceGroups();
                showToast(`上传 ${files.length} 个语音文件 ✅`);
                input.value = '';
            };
            window.batchGeneralVI = async (gIdx) => {
                const textarea = document.getElementById(`gv-batch-${gIdx}`);
                const lines = textarea?.value?.split('\n').map(l => l.trim()).filter(l => l) || [];
                if (!lines.length) return;
                if (!settings.generalVoiceGroups) settings.generalVoiceGroups = [];
                if (!settings.generalVoiceGroups[gIdx]) return;
                lines.forEach(line => {
                    const parts = line.split('|');
                    if (parts.length >= 2) {
                        settings.generalVoiceGroups[gIdx].items.push({ name: parts[0].trim(), src: parts[1]
                                .trim(), duration: parseFloat(parts[2]) || 3 });
                    }
                });
                saveSettings();
                renderGeneralVoiceGroups();
                textarea.value = '';
                showToast('导入成功 ✅');
            };

            function renderSettingsContactList() { const el = document.getElementById('settings-contact-list'); if (!el)
                    return;
                el.innerHTML = '';
                contacts.forEach(c => { const card = document.createElement('div');
                    card.className = `contact-card ${c.id===currentContactId?'active':''}`;
                    card.innerHTML =
                        `<img src="${escapeHtml(c.avatar)}" class="contact-avatar" onerror="this.src='https://picsum.photos/200/200?random=1'"><div class="contact-info"><p class="contact-name">${escapeHtml(c.name)}</p><p class="contact-status">${escapeHtml(c.status)}</p></div><div class="flex items-center space-x-2"><button class="switch-contact-btn text-[var(--theme)] text-sm" data-id="${c.id}">切换</button><button class="delete-contact-btn text-red-400" data-id="${c.id}"><i class="fa fa-trash"></i></button></div>`;
                    card.querySelector('.switch-contact-btn').onclick = () => switchContact(c.id);
                    card.querySelector('.delete-contact-btn').onclick = async () => { if (confirm(
                                `确定删除联系人「${c.name}」？所有聊天记录和信件都会被删除，不可恢复！`)) { await deleteContact(c
                                .id);
                            renderSettingsContactList(); } };
                    el.appendChild(card); }); }

            function renderStatusList() { const el = document.getElementById('status-list'); if (!el) return;
                el.innerHTML = ''; if (!settings.statusLibrary?.length) { el.innerHTML =
                        '<p class="text-xs text-center py-1">暂无</p>'; return; }
                settings.statusLibrary.forEach((s, idx) => { const d = document.createElement('div');
                    d.className = 'flex justify-between p-1 bg-[var(--card-bg)] rounded text-xs';
                    d.innerHTML = `<span>${escapeHtml(s)}</span><button class="text-red-400"><i class="fa fa-times"></i></button>`;
                    d.querySelector('button').onclick = async () => { settings.statusLibrary.splice(idx, 1);
                        saveSettings();
                        renderStatusList(); };
                    el.appendChild(d); }); }

            function renderPatSettings() {
                const myEl = document.getElementById('my-pat-list'); if (myEl) {
                    myEl.innerHTML = '';
                    settings.patLibrary.forEach((item, idx) => { const d = document.createElement('div');
                        d.className = 'pat-item';
                        d.innerHTML =
                        `<span>${escapeHtml(item)}</span><button class="text-red-400 delete-pat-btn" data-idx="${idx}"><i class="fa fa-times"></i></button>`;
                        d.querySelector('.delete-pat-btn').onclick = () => { settings.patLibrary.splice(idx, 1);
                            saveSettings();
                            renderPatSettings();
                            renderPatDrawer(); };
                        myEl.appendChild(d); });
                }
                const groupContainer = document.getElementById('partner-pat-groups');
                if (!groupContainer) return;
                groupContainer.innerHTML = '';
                if (!settings.partnerPatGroups) settings.partnerPatGroups = [];
                settings.partnerPatGroups.forEach((grp, gIdx) => {
                    const div = document.createElement('div');
                    div.className = 'border border-[var(--border-color)] rounded-xl p-3 mb-2';
                    div.innerHTML = `
                <div class="flex items-center justify-between mb-2"><input type="checkbox" ${grp.enabled?'checked':''} onchange="window.togglePartnerPatGroup(${gIdx},this.checked)"><span class="font-medium text-sm">${escapeHtml(grp.name)}</span><button onclick="window.deletePartnerPatGroup(${gIdx})" class="text-red-400 text-xs">删除分组</button></div>
                <div class="flex flex-wrap gap-1">${grp.items.map((item,i)=>`<span class="text-xs bg-[var(--theme-light)] px-2 py-0.5 rounded-full">${escapeHtml(item)} <button onclick="window.deletePartnerPatItem(${gIdx},${i})" class="ml-1 text-red-400">×</button></span>`).join('')}</div>
                <div class="flex space-x-1 mt-2"><input type="text" placeholder="添加" class="flex-1 px-2 py-1 border rounded text-xs" id="ppat-input-${gIdx}"><button onclick="window.addPartnerPatItem(${gIdx})" class="px-2 py-1 text-white rounded text-xs" style="background:var(--theme)">+</button></div>
                <textarea placeholder="批量导入（每行一条）" class="w-full px-2 py-1 border rounded text-xs resize-none mt-1" id="ppat-batch-${gIdx}"></textarea>
                <button onclick="window.batchPartnerPatItem(${gIdx})" class="w-full py-1 text-white rounded text-xs mt-1" style="background:var(--theme)">导入并去重</button>`;
                    groupContainer.appendChild(div);
                });
            }
            window.togglePartnerPatGroup = (gIdx, enabled) => { if (settings.partnerPatGroups) { settings
                        .partnerPatGroups[gIdx].enabled = enabled;
                    saveSettings(); } };
            window.deletePartnerPatGroup = (gIdx) => { settings.partnerPatGroups.splice(gIdx, 1);
                saveSettings();
                renderPatSettings(); };
            window.addPartnerPatItem = (gIdx) => { const input = document.getElementById(`ppat-input-${gIdx}`); const t =
                    input?.value?.trim(); if (t && settings.partnerPatGroups[gIdx]) { settings.partnerPatGroups[gIdx]
                        .items.push(t);
                    saveSettings();
                    renderPatSettings(); } };
            window.deletePartnerPatItem = (gIdx, i) => { settings.partnerPatGroups[gIdx].items.splice(i, 1);
                saveSettings();
                renderPatSettings(); };
            window.batchPartnerPatItem = (gIdx) => { const textarea = document.getElementById(`ppat-batch-${gIdx}`); const
                    lines = textarea?.value?.split('\n').map(l => l.trim()).filter(l => l) || []; if (!lines.length)
                    return; const set = new Set(settings.partnerPatGroups[gIdx].items);
                lines.forEach(l => { if (!set.has(l)) { settings.partnerPatGroups[gIdx].items.push(l);
                        set.add(l); } });
                saveSettings();
                renderPatSettings(); };

            function setupNumberControl(prefix, settingKey, min, max, unit) { const slider = document.getElementById(
                    `${prefix}-time`); const label = document.getElementById(`${prefix}-label`); const dec = document
                    .getElementById(`${prefix}-dec`); const inc = document.getElementById(`${prefix}-inc`); if (!slider ||
                    !label || !dec || !inc) return; let longPressTimer = null,
                    longPressInterval = null; const update = (v) => { v = Math.max(min, Math.min(max, v));
                    settings[settingKey] = v;
                    slider.value = v;
                    label.textContent = v + unit;
                    saveSettings(); };
                slider.oninput = e => update(parseInt(e.target.value)); const start = (d) => { update(settings[
                        settingKey] + d);
                    longPressTimer = setTimeout(() => { longPressInterval = setInterval(() => update(settings[
                            settingKey] + d), 100); }, 300); }; const stop = () => { clearTimeout(
                        longPressTimer);
                    clearInterval(longPressInterval); };
                dec.addEventListener('mousedown', () => start(-1));
                dec.addEventListener('mouseup', stop);
                dec.addEventListener('mouseleave', stop);
                dec.addEventListener('touchstart', () => start(-1));
                dec.addEventListener('touchend', stop);
                inc.addEventListener('mousedown', () => start(1));
                inc.addEventListener('mouseup', stop);
                inc.addEventListener('mouseleave', stop);
                inc.addEventListener('touchstart', () => start(1));
                inc.addEventListener('touchend', stop); }

            function setupImportExportEvents() {
                document.getElementById('export-selected-btn').onclick = async () => { const data = {}; if (document
                            .getElementById('export-settings').checked) data.settings = settings; if (document
                            .getElementById('export-contacts').checked) data.contacts = contacts; if (document
                            .getElementById('export-wordcards').checked) data.wordCardGroups = wordCardGroups; if (
                            document.getElementById('export-pat').checked) data.patData = { patLibrary: settings
                                .patLibrary, patCooldown: settings.patCooldown, partnerPatGroups: settings
                                .partnerPatGroups }; if (document.getElementById('export-emojis').checked) data
                            .emojiData = { emojis, emojiChars, kaomojiChars }; if (document.getElementById(
                                'export-posts').checked) data.posts = await getAllData('posts');
                        else data.posts = []; if (document.getElementById('export-letters').checked) data.letters =
                            await getAllData('letters');
                        else data.letters = []; if (document.getElementById('export-messages').checked) { data
                                .messages = await getAllData('messages');
                            data.groupMessages = await getAllData('groupMessages'); } else { data.messages = [];
                            data.groupMessages = []; } if (document.getElementById('export-mood').checked) data
                            .moodData = { moodSymbols: settings.moodSymbols, myMoodHistory: settings
                                .myMoodHistory, moodRecycleBin: settings.moodRecycleBin }; if (document.getElementById('export-period').checked) {
                            data.periodRecords = periodRecords;
                            data.periodCycles = periodCycles;
                            data.periodSettings = settings.period; } if (document.getElementById(
                                'export-statuses').checked) data.contactStatuses = contacts.map(c => ({ id: c.id,
                                name: c.name, statusLibrary: c.statusLibrary })); if (document.getElementById(
                                'export-general-voice').checked) data.generalVoiceGroups = settings
                            .generalVoiceGroups; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url =
                            URL.createObjectURL(blob); const a = document.createElement('a');
                        a.href = url;
                        a.download = 'LOVE_选中数据_' + new Date().toISOString().slice(0, 10) + '.json';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                        showToast('导出成功 ✅'); };
                document.getElementById('export-all-btn').onclick = async () => { const data = { settings, contacts,
                        wordCardGroups, emojis, emojiChars, kaomojiChars, messages: await getAllData('messages'),
                        groupMessages: await getAllData('groupMessages'), letters: await getAllData('letters'),
                        posts: await getAllData('posts'), groups, moodData: { moodSymbols: settings.moodSymbols,
                            myMoodHistory: settings.myMoodHistory }, periodRecords, periodCycles,
                        periodSettings: settings.period, generalVoiceGroups: settings.generalVoiceGroups,
                        exportTime: new Date().toISOString() }; const blob = new Blob([JSON.stringify(data,
                            null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(
                        blob); const a = document.createElement('a');
                    a.href = url;
                    a.download = 'LOVE_全部数据_' + new Date().toISOString().slice(0, 10) + '.json';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                    showToast('导出成功 ✅'); };
                document.getElementById('import-all').onchange = e => { const file = e.target.files[0]; if (!file)
                        return; const reader = new FileReader();
                    reader.onload = async (ev) => { try { const data = JSON.parse(ev.target.result); if (data
                                .settings) { for (const key of Object.keys(data.settings)) { if (data.settings[key] !== undefined && data.settings[key] !== null) settings[key] = data.settings[key]; } } if (data.contacts) { await
                                clearStore('contacts');
                                contacts = []; for (const c of data.contacts) { const id = await addData(
                                        'contacts', c);
                                    c.id = id;
                                    contacts.push(c); } } if (data.groups) { await clearStore('groups');
                                groups = []; for (const g of data.groups) { const id = await addData('groups',
                                        g);
                                    g.id = id;
                                    groups.push(g); } } if (data.wordCardGroups) { await clearStore(
                                    'wordCards');
                                wordCardGroups = []; for (const g of data.wordCardGroups) { const id =
                                        await addData('wordCards', g);
                                    g.id = id;
                                    wordCardGroups.push(g); } } if (data.emojis || data.emojiData) { const
                                    emojiData = data.emojiData || data;
                                await clearStore('emojis');
                                emojis = []; for (const e of emojiData.emojis || []) { const id = await
                                        addData('emojis', e);
                                    e.id = id;
                                    emojis.push(e); }
                                emojiChars = emojiData.emojiChars || data.emojiChars || [...DEFAULT_EMOJI_CHARS];
                                kaomojiChars = emojiData.kaomojiChars || data.kaomojiChars || [
                                    ...DEFAULT_KAOMOJI_CHARS
                                ]; } if (data.messages) { await clearStore('messages'); for (const m of data
                                    .messages) { await addData('messages', m); } } if (data.groupMessages) {
                                await clearStore('groupMessages'); for (const m of data.groupMessages) { await
                                        addData('groupMessages', m); } } if (data.letters) { await clearStore(
                                    'letters'); for (const l of data.letters) { await addData('letters', l); } }
                            if (data.posts) { await clearStore('posts'); for (const p of data.posts) { await
                                        addData('posts', p); } } if (data.moodData) { settings.moodSymbols =
                                    data.moodData.moodSymbols || DEFAULT_MOOD_SYMBOLS;
                                settings.myMoodHistory = data.moodData.myMoodHistory || [];
                                settings.moodRecycleBin = data.moodData.moodRecycleBin || []; } if (data
                                .periodRecords) { await clearStore('periodRecords');
                                periodRecords = []; for (const r of data.periodRecords || []) { const id =
                                        await addData('periodRecords', r);
                                    r.id = id;
                                    periodRecords.push(r); } } if (data.periodCycles) { await clearStore(
                                    'periodCycles');
                                periodCycles = []; for (const c of data.periodCycles || []) { const id =
                                        await addData('periodCycles', c);
                                    c.id = id;
                                    periodCycles.push(c); } } if (data.periodSettings) { settings.period = data
                                    .periodSettings; } if (data.generalVoiceGroups) { settings
                                    .generalVoiceGroups = data.generalVoiceGroups; } await
                            saveSettings(); if (contacts.length > 0) await switchContact(contacts[0].id);
                            updateUI();
                            showToast('导入成功 ✅'); } catch (err) { showToast('导入失败：' + err.message); } };
                    reader.readAsText(file);
                    e.target.value = ''; };
                document.getElementById('clear-all-data-btn').onclick = clearAllData;
                document.getElementById('export-chat-records-btn').onclick = async () => { const data = { messages: await
                                getAllData('messages'), groupMessages: await getAllData('groupMessages'),
                            exportTime: new Date().toISOString() }; const blob = new Blob([JSON.stringify(data,
                                null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(
                            blob); const a = document.createElement('a');
                        a.href = url;
                        a.download = 'LOVE_聊天记录_' + new Date().toISOString().slice(0, 10) + '.json';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                        showToast('聊天记录导出成功 ✅'); };
                document.getElementById('import-chat-records').onchange = async (e) => { const file = e.target
                        .files[0]; if (!file) return; const reader = new FileReader();
                    reader.onload = async (ev) => { try { const data = JSON.parse(ev.target.result); if (data
                                .messages) { await clearStore('messages'); for (const m of data.messages) { await
                                        addData('messages', m); } } if (data.groupMessages) { await clearStore(
                                    'groupMessages'); for (const m of data.groupMessages) { await addData(
                                        'groupMessages', m); } } if (currentContactId) await
                                loadCurrentContactData();
                            renderMessages();
                            showToast('聊天记录导入成功 ✅'); } catch (err) { showToast('导入失败：' + err.message); } };
                    reader.readAsText(file);
                    e.target.value = ''; };
                document.getElementById('clear-chat-records-btn').onclick = async () => { if (!confirm(
                            '确定清空所有聊天记录吗？此操作不可恢复！')) return;
                    await clearStore('messages');
                    await clearStore('groupMessages');
                    messages = [];
                    groupMessages = [];
                    renderMessages();
                    showToast('聊天记录已清空 ✅'); };
            }

            async function clearAllData() { if (!confirm('确定清空所有数据？此操作不可恢复！')) return;
                clearReplyQueue(); if (statusTimer) clearTimeout(statusTimer); if (activeMsgTimer) clearTimeout(
                    activeMsgTimer); if (partnerCallTimer) clearTimeout(partnerCallTimer); if (partnerLetterTimer)
                    clearTimeout(partnerLetterTimer); if (moodRefreshTimer) clearTimeout(moodRefreshTimer); if (
                    chatInviteTimer) clearTimeout(chatInviteTimer);
                Object.values(allStatusTimers).forEach(t => clearTimeout(t));
                allStatusTimers = {};
                await clearStore('messages');
                await clearStore('wordCards');
                await clearStore('emojis');
                await clearStore('letters');
                await clearStore('posts');
                await clearStore('contacts');
                await clearStore('settings');
                await clearStore('groups');
                await clearStore('groupMessages');
                await clearStore('periodRecords');
                await clearStore('periodCycles');
                contacts = [];
                groups = [];
                currentContactId = null;
                currentGroupId = null;
                messages = [];
                wordCardGroups = [];
                emojis = [];
                emojiChars = [...DEFAULT_EMOJI_CHARS];
                kaomojiChars = [...DEFAULT_KAOMOJI_CHARS];
                letters = [];
                posts = [];
                periodRecords = [];
                periodCycles = [];
                Object.assign(settings, { myName: '我', myStatus: '在线', myAvatar: 'https://picsum.photos/200/200?random=2',
                    themeColor: '#D4A5A5', bubbleMeColor: '#E8D5C4', bubbleYouColor: '#FFFFFF', borderRadius: 20,
                    bgImage: '', bgBlur: 0, bgOpacity: 1, darkMode: false, avatarFlow: false,                 avatarSquare: false,
                avatarFloat: false,
                avatarFrame: 'none',
                avatarCustomCSS: '', customCSS: '', bgEffects: { enabled: true }, momentsBg: '', myMoodText: '😊',
                    minReplyTime: 1, maxReplyTime: 3600, maxCardsPerReply: 3, statusMin: 5, statusMax: 60,
                    activeMsgEnabled: false, activeMsgMin: 10, activeMsgMax: 60, activeMsgChance: 0.3,
                    partnerCallChance: 0.05, partnerLetterMin: 10, partnerLetterMax: 24, partnerLetterChance: 0.3, callAcceptChance: 0.6, callRejectChance: 0.4, callHangupMin: 2,
                    callHangupMax: 15, patCooldown: 5, patLibrary: [...DEFAULT_PAT_LIBRARY], partnerPatGroups: [],
                    statusLibrary: [...DEFAULT_STATUS_LIBRARY], customWeatherOptions: [],
                    separateEmojiEnabled: true,
                    quoteEnabled: true,
                    quoteChance: 0.3,
                    combineCardsEnabled: true,
                    combineCardsChance: 0.3,
                    combineCardsMin: 2,
                    combineCardsMax: 4,
                    moodSymbols: DEFAULT_MOOD_SYMBOLS, myMoodHistory: [], moodRecycleBin: [], callBgs: [],
                    letterReplyMin: 3600, letterReplyMax: 86400, letterCardCountMin: 5, letterCardCountMax: 15, moodRefreshHour: 6, pendingLetterReplies: [],
                    groupCallAcceptChance: 0.7, groupCallRejectChance: 0.2, groupCallTimeoutChance: 0.1,
                    replyPatChance: 0.07, replyCallChance: 0.03, postReplyMin: 300, postReplyMax: 21600,
                    commentReplyMin: 180, commentReplyMax: 1800, commentReplyChance: 1.0, voiceReplyChance: 0.06,
                    generalVoiceGroups: [], maxCardsPerReplyUser: 4, readReceiptEnabled: false,
                    readReceiptChance: 0.2, period: { reminders: { periodStart: true, periodEnd: true,
                            ovulation: false, nextPeriod: true, daysBefore: 2, time: '08:00' },
                        customMessages: { periodStart: '大姨妈快来了，包包里放片卫生巾吧 🌸',
                            periodEnd: '经期结束了，可以吃点好的补补 💪' }, privacy: { passwordEnabled: false,
                            password: null }, averageCycle: 28, averagePeriod: 5, lastPeriodStart: null,
                        lastPeriodEnd: null } });
                await saveSettings(); const dc = await addContact({});
                await switchContact(dc.id);
                updateUI();
                showToast('所有数据已清空'); }

            function setupEventListeners() {
                try {
                document.getElementById('contact-switcher').onclick = () => { showContactHome(); };
                var osfh = document.getElementById('open-settings-from-home'); if (osfh) osfh.onclick = () => { document.getElementById(
                        'settings-slide').classList.add('open'); };
                var _acb = document.getElementById('add-contact-btn'); if (_acb) _acb.onclick = async () => { const name = prompt('输入联系人昵称'); if (name?.trim()) { const nc = await addContact({ name: name.trim() }); renderContactList(); await switchContact(nc.id); } };
                document.getElementById('partner-name').onclick = () => { const c = getCurrentContact(); if (!c) return;
                    const n = prompt('修改昵称', c.name); if (n?.trim()) { c.name = n.trim();
                        document.getElementById('partner-name').textContent = c.name;
                        updateContact(c);
                        renderContactList(); } };
                document.getElementById('close-contact-home').onclick = function() { document.getElementById('contact-home-panel').classList.remove('open'); };
                document.getElementById('ch-view-moments').onclick = function() { document.getElementById('contact-home-panel').classList.remove('open'); var momentsPanel = document.getElementById('moments-panel'); if (momentsPanel) { momentsPanel.classList.add('open'); renderContactMomentsOnly(); } };
                document.getElementById('ch-call').onclick = function() { document.getElementById('contact-home-panel').classList.remove('open'); if (LOVE.startCall) LOVE.startCall(); };
                var chLetter = document.getElementById('ch-letter'); if (chLetter) chLetter.onclick = function() { document.getElementById('contact-home-panel').classList.remove('open'); if (LOVE.openLetter) LOVE.openLetter(); };
                document.getElementById('ch-set-bg').onclick = function() {
                    var c = getCurrentContact(); if (!c) return;
                    var existing = document.getElementById('ch-bg-actions');
                    if (existing) existing.remove();
                    var actions = document.createElement('div');
                    actions.id = 'ch-bg-actions';
                    actions.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:200;background:var(--card-bg);border:1px solid var(--border-color);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px;min-width:200px;box-shadow:0 8px 40px rgba(0,0,0,0.3);';
                    actions.innerHTML = '<div style="font-size:14px;font-weight:600;color:var(--text-primary);text-align:center;margin-bottom:4px;">设置聊天背景</div><button id="ch-bg-upload-btn" style="background:var(--theme-light);color:var(--text-primary);border:none;border-radius:10px;padding:10px 16px;font-size:13px;cursor:pointer;">📁 上传图片</button><button id="ch-bg-url-btn" style="background:var(--theme-light);color:var(--text-primary);border:none;border-radius:10px;padding:10px 16px;font-size:13px;cursor:pointer;">🔗 输入URL</button><button id="ch-bg-clear-btn" style="background:var(--theme-light);color:var(--text-primary);border:none;border-radius:10px;padding:10px 16px;font-size:13px;cursor:pointer;">✕ 清除背景</button>';
                    document.body.appendChild(actions);
                    setTimeout(function() {
                        var closer = function(ev2) {
                            if (!ev2.target.closest('#ch-bg-actions')) { actions.remove(); document.removeEventListener('click', closer); }
                        };
                        document.addEventListener('click', closer);
                    }, 10);
                    document.getElementById('ch-bg-upload-btn').onclick = function(ev2) { ev2.stopPropagation();
                        actions.remove();
                        var input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async function(e) {
                            var f = e.target.files[0];
                            if (!f) return;
                            var src = await compressImage(f, 1920, 0.88);
                            c.bgImage = src;
                            updateContact(c);
                            updateChatBackground();
                            showToast('背景已更新 ✅');
                        };
                        input.click();
                    };
                    document.getElementById('ch-bg-url-btn').onclick = function(ev2) { ev2.stopPropagation();
                        actions.remove();
                        var u = prompt('输入聊天背景图片URL\n（留空使用全局背景）', c.bgImage || '');
                        if (u !== null) { c.bgImage = u || ''; updateContact(c); updateChatBackground(); showToast(u ? '背景已设置' : '已恢复全局背景'); }
                    };
                    document.getElementById('ch-bg-clear-btn').onclick = function(ev2) { ev2.stopPropagation();
                        actions.remove();
                        c.bgImage = '';
                        updateContact(c);
                        updateChatBackground();
                        showToast('已清除背景');
                    };
                };
                document.getElementById('ch-avatar').onclick = function() { var c = getCurrentContact(); if (!c) return; var input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = async function(e) { var f = e.target.files[0]; if (!f) return; var src = await compressImage(f, 512, 0.9); c.avatar = src; await updateContact(c); document.getElementById('ch-avatar').src = src; document.getElementById('partner-avatar').src = src; applyAvatarEffects(); showToast('头像已更新 ✅'); }; input.click(); };
                document.getElementById('ch-avatar').style.cursor = 'pointer';
                document.getElementById('ch-avatar-frame').onclick = function() {
                    var c = getCurrentContact(); if (!c) return;
                    var modal = document.getElementById('ch-sub-modal');
                    var title = document.getElementById('ch-sub-title');
                    var content = document.getElementById('ch-sub-content');
                    if (!modal || !title || !content) return;
                    title.textContent = '🖼️ 头像框 - ' + c.name;
                    var frameOpts = ['none', 'glow', 'thin', 'double', 'rainbow'];
                    var frameLabels = { none: '无', glow: '💫 发光', thin: '细边', double: '双层', rainbow: '🌈 彩虹' };
                    var current = c.avatarFrame || 'none';
                    var curCustom = c.avatarCustomCSS || '';
                    content.innerHTML = '<div class="text-sm space-y-2">' + frameOpts.map(function(v) {
                        var label = frameLabels[v];
                        var sel = current === v ? ' checked' : '';
                        return '<label class="flex items-center space-x-2 py-2 px-3 rounded-lg hover:bg-[var(--theme-light)] cursor-pointer border border-[var(--border-color)]"><input type="radio" name="ch-af-select" value="' + v + '"' + sel + '><span>' + label + '</span></label>';
                    }).join('') + '</div><hr class="border-[var(--border-color)] my-2"><div class="flex flex-col"><span class="text-xs text-[var(--text-secondary)] mb-1">🎨 自定义CSS</span><textarea id="ch-avatar-custom-css" rows="3" class="w-full px-3 py-2 border rounded-lg text-xs font-mono resize-y" placeholder="box-shadow: 0 0 20px #ff6b9d;">' + escapeHtml(curCustom) + '</textarea></div>';
                    modal.classList.remove('hidden');
                    content.querySelectorAll('input[name="ch-af-select"]').forEach(function(r) {
                        r.onchange = function() {
                            c.avatarFrame = this.value;
                            updateContact(c);
                            applyAvatarEffects();
                            showToast('头像框已更新 ✅');
                            modal.classList.add('hidden');
                        };
                    });
                    setTimeout(function() {
                        var cssTa = document.getElementById('ch-avatar-custom-css');
                        if (cssTa) cssTa.oninput = function() {
                            c.avatarCustomCSS = this.value;
                            updateContact(c);
                            applyAvatarEffects();
                        };
                    }, 50);
                };
                document.getElementById('ch-css-bubble').onclick = function() { var c = getCurrentContact(); if (!c) return; openChSubModal('bubble-css', c); };
                document.getElementById('ch-reply-settings').onclick = function() { var c = getCurrentContact(); if (!c) return; openChSubModal('reply-settings', c); };
                document.getElementById('ch-manage-wordcards').onclick = function() { var c = getCurrentContact(); if (!c) return; openChSubModal('manage-wordcards', c); };
                document.getElementById('ch-manage-emojis').onclick = function() { var c = getCurrentContact(); if (!c) return; openChSubModal('manage-emojis', c); };
                document.getElementById('ch-manage-voices').onclick = function() { var c = getCurrentContact(); if (!c) return; openChSubModal('manage-voices', c); };
                document.getElementById('ch-delete-contact').onclick = function() { var c = getCurrentContact(); if (!c) return; if (!confirm('确定删除联系人"' + c.name + '"？\n将同时删除其所有聊天记录。')) return; deleteContactAndSwitch(c.id); };
                document.getElementById('ch-sub-modal').addEventListener('click', function(e) { if (e.target === this) this.classList.add('hidden'); });
                document.getElementById('ch-sub-close').onclick = function() { document.getElementById('ch-sub-modal').classList.add('hidden'); };
                var homeAddBtn = document.getElementById('home-add-btn'); if (homeAddBtn) homeAddBtn.onclick = function() { var sheet = document.getElementById('add-action-sheet'); if (sheet) sheet.classList.remove('hidden'); };
                var homeBtn = document.getElementById('back-to-home-btn'); if (homeBtn) homeBtn.onclick = showHomeView;
                document.getElementById('send-btn').onclick = sendMessage;
                messageInput.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault();
                        sendMessage(); } };
                messageInput.oninput = function() {
                    var sb = document.getElementById('send-btn');
                    if (sb) {
                        if (this.value.trim()) sb.classList.remove('hidden');
                        else sb.classList.add('hidden');
                    }
                };
                document.getElementById('cancel-quote').onclick = hideQuoteBar;
                document.getElementById('force-reply-btn').onclick = () => triggerUnifiedReply();
                document.getElementById('video-call-btn').onclick = () => { if (currentChatType === 'group')
                        startGroupCall();
                    else startCall(); };
                document.getElementById('emoji-btn').onclick = () => { const d = document.getElementById('emoji-drawer');
                    d.classList.toggle('show'); if (d.classList.contains('show')) { renderEmojiDrawer();
                        switchEmojiTab('emoji-lib'); } document.body.classList.toggle('emoji-open', d.classList.contains('show')); };
                document.querySelectorAll('#emoji-drawer .emoji-tab').forEach(t => t.onclick = () => switchEmojiTab(t
                    .dataset.tab));
                document.getElementById('batch-emoji-btn').onclick = () => { const txt = document.getElementById(
                        'batch-emoji-input').value.trim(); if (!txt) return; const chars = [...new Set([...txt]
                        .filter(ch => /\p{Emoji}/u.test(ch)))]; var packs = settings.emojiPacks || [];
                    if (packs.length > 0) {
                        if (!packs[0].emojis) packs[0].emojis = [];
                        var set = new Set(packs[0].emojis);
                        chars.forEach(function(c) { if (!set.has(c)) { packs[0].emojis.push(c); set.add(c); } });
                    } else {
                        var set = new Set(emojiChars);
                        chars.forEach(function(c) { if (!set.has(c)) { emojiChars.push(c); set.add(c); } });
                    }
                    saveSettings();
                    renderEmojiDrawer();
                    renderEmojiPacksList();
                    document.getElementById('batch-emoji-input').value = '';
                    showToast('导入' + chars.length + '个表情 ✅'); };
                document.getElementById('batch-kaomoji-btn').onclick = () => { const txt = document.getElementById(
                        'batch-kaomoji-input').value.trim(); if (!txt) return; const lines = txt.split('\n').map(l =>
                        l.trim()).filter(l => l); const set = new Set(kaomojiChars);
                    lines.forEach(l => { if (!set.has(l)) { kaomojiChars.push(l);
                            set.add(l); } });
                    saveSettings();
                    renderEmojiDrawer();
                    document.getElementById('batch-kaomoji-input').value = '';
                    showToast(`导入${lines.length}个颜文字 ✅`); };
                document.getElementById('create-emoji-pack').onclick = () => { const inp = document.getElementById('new-pack-name'); const name = inp?.value.trim(); if (!name) { showToast('请输入分组名'); return; } var packs = settings.emojiPacks || []; packs.push({ name: name, icon: '📁', emojis: [] }); settings.emojiPacks = packs; saveSettings(); inp.value = ''; renderEmojiPacksList(); renderEmojiDrawer(); showToast('创建分组 ✅'); };
                document.getElementById('create-shared-group').onclick = () => { const inp = document.getElementById('new-shared-group-name'); const name = inp?.value.trim(); if (!name) { showToast('请输入组名'); return; } var groups = settings.sharedEmojiGroups || []; groups.push({ id: 'g_' + Date.now(), name: name, enabled: true }); settings.sharedEmojiGroups = groups; saveSettings(); inp.value = ''; renderSharedGroupList(); renderEmojiDrawer(); showToast('创建分组 ✅'); };
                document.getElementById('emoji-upload').onchange = e => { const files = e.target.files; if (!files
                        .length) return; const cat = document.querySelector(
                        'input[name="emoji-category"]:checked')?.value || 'mine'; let count = 0;
                    var selGroup = document.getElementById('upload-emoji-group');
                    var grp = (selGroup && cat === 'shared') ? selGroup.value : undefined;
                    Array.from(files).forEach(f => {
                        compressImage(f, 512, 0.9).then(src => {
                            if (!src) { count++; if (count === files.length) { e.target.value = ''; } return; }
                            const obj = { src, category: cat };
                            if (cat === 'shared') obj.group = grp || 'default';
                            addData('emojis', obj).then(id => {
                                obj.id = id;
                                emojis.push(obj);
                                count++; if (count === files.length) { renderEmojiDrawer();
                                    showToast(`上传${count}个表情包 ✅`); }
                            });
                        });
                    });
                    e.target.value = ''; };
                document.getElementById('add-custom-emoji-btn').onclick = () => { const v = prompt('输入Emoji'); if (v
                        ?.trim()) { emojiChars.push(v.trim());
                        saveSettings();
                        renderEmojiDrawer(); } };
                document.getElementById('pat-btn').onclick = () => { const d = document.getElementById('emoji-drawer');
                    d.classList.add('show'); document.body.classList.add('emoji-open'); switchEmojiTab('pat'); };
                document.getElementById('pat-send-custom').onclick = () => { const v = document.getElementById(
                        'pat-custom-input').value.trim(); if (v) sendPat(v); };
                document.getElementById('letter-btn').onclick = () => { document.getElementById('letter-inbox')
                        .classList.add('open');
                    renderLetterList(); };
                document.getElementById('close-letter-inbox').onclick = () => document.getElementById('letter-inbox')
                    .classList.remove('open');
                document.getElementById('write-letter-btn').onclick = () => document.getElementById('letter-compose')
                    .classList.add('open');
                document.getElementById('close-letter-compose').onclick = () => document.getElementById(
                        'letter-compose').classList.remove('open');
                let replyToLetterId = null;
                document.getElementById('send-letter-compose').onclick = () => { const t = document.getElementById(
                        'compose-letter-text').value.trim(); if (t) { var asPartner = document.getElementById('compose-as-partner') && document.getElementById('compose-as-partner').checked;
                        sendMyLetter(t, replyToLetterId, !asPartner);
                        replyToLetterId = null;
                    document.getElementById('compose-letter-text').value = '';
                    document.getElementById('letter-compose').classList.remove('open'); } };
                document.getElementById('close-letter-detail').onclick = () => { document.getElementById(
                        'letter-detail').classList.remove('open');
                    document.getElementById('letter-inbox').classList.add('open'); };
                document.getElementById('reply-letter-btn').onclick = () => { replyToLetterId = currentLetterId;
                    document.getElementById('letter-detail').classList.remove('open');
                    document.getElementById('letter-compose').classList.add('open');
                    document.getElementById('compose-letter-text').value = ''; };
                // ===== 心情按钮（原有） =====
                document.getElementById('mood-btn').onclick = (e) => {
                    e.stopPropagation();
                    document.getElementById('mood-calendar-panel').classList.add('open');
                    switchModule('mood');
                };
                // ===== 经期按钮（已删除入口） =====
                // 通过心情面板中的切换按钮进入

                // ===== 模块切换 =====
                document.getElementById('switch-to-mood').onclick = () => switchModule('mood');
                document.getElementById('switch-to-period').onclick = () => switchModule('period');

                // ===== 心情Tab切换 =====
                document.querySelectorAll('.mood-tab-btn').forEach(btn => {
                    btn.onclick = function() {
                        switchMoodTab(this.dataset.tab);
                    };
                });

                // ===== 经期Tab切换 =====
                document.querySelectorAll('.period-tab-btn').forEach(btn => {
                    btn.onclick = function() {
                        switchPeriodTab(this.dataset.tab);
                    };
                });

                // ===== 经期新增按钮 =====
                document.getElementById('add-period-from-calendar').onclick = () => {
                    const today = formatDateISO(new Date());
                    showPeriodRecordModal(today);
                };

                // ===== 关闭经期记录弹窗 =====
                document.getElementById('close-period-record').onclick = () => {
                    document.getElementById('period-record-modal').classList.add('hidden');
                };

                // ===== 保存经期记录 =====
                document.getElementById('save-period-record').onclick = savePeriodRecord;

                // ===== 删除经期记录 =====
                document.getElementById('delete-period-record').onclick = async function() {
                    var id = parseInt(this.dataset.id);
                    if (!id || !confirm('确定删除此记录吗？')) return;
                    await deleteData('periodRecords', id);
                    periodRecords = periodRecords.filter(function(r) { return r.id !== id; });
                    document.getElementById('period-record-modal').classList.add('hidden');
                    renderPeriodCalendar();
                    recalculatePeriodCycles();
                    showToast('记录已删除');
                };

                // ===== 同步经期记录到所有联系人 =====
                document.getElementById('sync-period-record').onclick = async function() {
                    var date = this.dataset.date;
                    if (!date) return;
                    var sourceRecord = periodRecords.find(function(r) { return r.date === date && r.contactId === currentContactId; });
                    if (!sourceRecord) { showToast('未找到记录'); return; }
                    if (!confirm('确定将 ' + date + ' 的记录同步到所有联系人吗？这将覆盖已有记录。')) return;
                    var count = 0;
                    for (var i = 0; i < contacts.length; i++) {
                        var cid = contacts[i].id;
                        if (cid === currentContactId) continue;
                        var existing = periodRecords.findIndex(function(r) { return r.date === date && r.contactId === cid; });
                        var r = { date: date, contactId: cid, isPeriod: sourceRecord.isPeriod,
                            periodDay: sourceRecord.periodDay, flow: sourceRecord.flow, pain: sourceRecord.pain,
                            mood: sourceRecord.mood ? sourceRecord.mood.slice() : [],
                            medicine: sourceRecord.medicine ? sourceRecord.medicine.slice() : [],
                            note: sourceRecord.note || '', createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString() };
                        if (existing >= 0) { r.id = periodRecords[existing].id;
                            r.createdAt = periodRecords[existing].createdAt;
                            await updateData('periodRecords', r);
                            periodRecords[existing] = r; } else { var id = await addData('periodRecords', r);
                            r.id = id;
                            periodRecords.push(r); }
                        count++;
                    }
                    renderPeriodCalendar();
                    showToast('已同步到 ' + count + ' 个联系人');
                };

                // ===== 是否经期切换 =====
                document.querySelectorAll('input[name="period-yesno"]').forEach(radio => {
                    radio.onchange = function() {
                        const section = document.getElementById('period-day-section');
                        if (this.value === 'yes') section.classList.remove('hidden');
                        else section.classList.add('hidden');
                    };
                });

                // ===== 流量/痛感选择 =====
                document.querySelectorAll('.flow-btn').forEach(btn => {
                    btn.onclick = function() {
                        document.querySelectorAll('.flow-btn').forEach(b => b.classList.remove('active'));
                        this.classList.add('active');
                    };
                });
                document.querySelectorAll('.pain-btn').forEach(btn => {
                    btn.onclick = function() {
                        document.querySelectorAll('.pain-btn').forEach(b => b.classList.remove('active'));
                        this.classList.add('active');
                    };
                });

                // ===== 情绪/用药多选 =====
                document.querySelectorAll('.mood-btn').forEach(btn => {
                    btn.onclick = function() {
                        this.classList.toggle('active');
                    };
                });
                document.querySelectorAll('.med-btn').forEach(btn => {
                    btn.onclick = function() {
                        this.classList.toggle('active');
                    };
                });

                // ===== 心情原有事件 =====
                document.getElementById('close-mood-btn').onclick = () => document.getElementById('mood-panel')
                    .classList.add('hidden');
                document.getElementById('mood-panel').addEventListener('click', function(e) { if (e.target === this)
                        this.classList.add('hidden'); });
                document.getElementById('save-mood-btn').onclick = saveMyMood;
                document.getElementById('close-add-mood-btn').onclick = () => document.getElementById('add-mood-panel')
                    .classList.add('hidden');
                document.getElementById('add-mood-panel').addEventListener('click', function(e) { if (e.target ===
                        this) this.classList.add('hidden'); });
                document.getElementById('add-mood-btn').onclick = () => {
                    const emoji = document.getElementById('new-mood-emoji').value.trim();
                    const name = document.getElementById('new-mood-name').value.trim();
                    const desc = document.getElementById('new-mood-desc').value.trim();
                    if (emoji && name) {
                        settings.moodSymbols.push({ emoji, name, description: desc });
                        saveSettings();
                        document.getElementById('add-mood-panel').classList.add('hidden');
                        document.getElementById('new-mood-emoji').value = '';
                        document.getElementById('new-mood-name').value = '';
                        document.getElementById('new-mood-desc').value = '';
                        renderMoodEmojiPicker();
                        renderMoodSelectorGrid();
                        showToast('心情添加成功 ✅');
                    } else showToast('请输入表情和名称');
                };
                document.getElementById('add-mood-from-calendar').onclick = (e) => {
                    e.stopPropagation();
                    document.getElementById('add-mood-panel').classList.remove('hidden');
                    renderMoodSelectorGrid();
                };
                document.getElementById('prev-month').onclick = () => { currentCalendarDate.setMonth(currentCalendarDate
                        .getMonth() - 1);
                    renderMoodCalendar(); };
                document.getElementById('next-month').onclick = () => { currentCalendarDate.setMonth(currentCalendarDate
                        .getMonth() + 1);
                    renderMoodCalendar(); };
                document.getElementById('close-mood-calendar').onclick = () => document.getElementById(
                        'mood-calendar-panel').classList.remove('open');
                // ===== 经期日历导航 =====
                document.getElementById('period-prev-month').onclick = () => { currentCalendarDate.setMonth(
                        currentCalendarDate.getMonth() - 1);
                    renderPeriodCalendar(); };
                document.getElementById('period-next-month').onclick = () => { currentCalendarDate.setMonth(
                        currentCalendarDate.getMonth() + 1);
                    renderPeriodCalendar(); };

                document.getElementById('close-mood-day-detail').onclick = () => { document.getElementById(
                        'mood-day-detail').classList.remove('open');
                    document.getElementById('mood-calendar-panel').classList.add('open'); };
                document.getElementById('moments-btn').onclick = () => { document.getElementById('moments-panel')
                        .classList.add('open');
                    renderMoments(); };
                document.getElementById('close-moments').onclick = () => document.getElementById('moments-panel')
                    .classList.remove('open');
                var momentsFilter = document.getElementById('moments-filter');
                if (momentsFilter) momentsFilter.onchange = () => renderMoments();
                document.getElementById('post-moment-btn').onclick = () => document.getElementById('moment-compose')
                    .classList.add('open');
                document.getElementById('close-moment-compose').onclick = () => document.getElementById(
                        'moment-compose').classList.remove('open');
                document.getElementById('moments-banner-img').onclick = function() {
                    var input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async function(e) {
                        var f = e.target.files[0];
                        if (!f) return;
                        var src = await compressImage(f, 1920, 0.88);
                        settings.momentsBg = src;
                        saveSettings();
                        document.getElementById('moments-banner-img').src = src;
                        showToast('朋友圈背景已更新 ✅');
                    };
                    input.click();
                };
                document.getElementById('moments-banner-img').style.cursor = 'pointer';
                document.getElementById('close-contact-list').onclick = () => { document.getElementById('contact-list-panel').classList.remove('open'); };
                var tabC = document.getElementById('tab-contacts'), tabG = document.getElementById('tab-groups');
                if (tabC) tabC.onclick = function() { document.getElementById('contact-list-content').classList.remove('hidden'); document.getElementById('group-list-content').classList.add('hidden'); this.style.borderColor = 'var(--theme)'; this.style.color = 'var(--theme)'; if (tabG) { tabG.style.borderColor = 'transparent'; tabG.style.color = ''; } };
                if (tabG) tabG.onclick = function() { document.getElementById('group-list-content').classList.remove('hidden'); document.getElementById('contact-list-content').classList.add('hidden'); this.style.borderColor = 'var(--theme)'; this.style.color = 'var(--theme)'; if (tabC) { tabC.style.borderColor = 'transparent'; tabC.style.color = ''; } renderGroupList(); };
                document.getElementById('publish-moment-btn').onclick = publishMoment;
                document.getElementById('moment-image-upload').onchange = (e) => { const f = e.target.files[0]; if (!
                        f) return;
                    document.getElementById('moment-image-name').textContent = f.name;
                    document.getElementById('clear-moment-image').classList.remove('hidden');
                    compressImage(f, 1920, 0.88).then(src => {
                        if (!src) return;
                        document.getElementById('moment-preview-img').src = src;
                        document.getElementById('moment-image-preview').classList.remove('hidden');
                        document.getElementById('moment-preview-img').dataset.compressed = src;
                    }); };
                document.getElementById('clear-moment-image').onclick = () => { document.getElementById(
                        'moment-image-upload').value = '';
                    document.getElementById('moment-image-name').textContent = '';
                    document.getElementById('moment-image-preview').classList.add('hidden');
                    document.getElementById('clear-moment-image').classList.add('hidden'); };
                document.getElementById('settings-btn').onclick = () => { document.getElementById('settings-slide')
                        .classList.add('open'); };
                document.getElementById('close-settings-top').onclick = () => { document.getElementById(
                        'settings-subpages').classList.add('hidden'); const home = document.getElementById(
                        'settings-home');
                    home.classList.remove('hidden');
                    home.style.display = '';
                    document.getElementById('settings-slide').classList.remove('open'); };
                document.querySelectorAll('#settings-home .folder-tab').forEach(tab => { tab.onclick = function() {
                        const page = this.dataset.page; if (!page) return;
                        document.getElementById('settings-home').style.display = 'none'; const subContainer =
                            document.getElementById('settings-subpages');
                        subContainer.classList.remove('hidden');
                        subContainer.innerHTML = '';
                        openSubPage(page); const backBtn = subContainer.querySelector('#back-to-settings'); if (
                            backBtn) { backBtn.onclick = () => { subContainer.classList.add('hidden');
                                const home = document.getElementById('settings-home');
                                home.classList.remove('hidden');
                                home.style.display = ''; } }; }; });
                document.getElementById('darkmode-btn').onclick = () => { settings.darkMode = !settings.darkMode;
                    applySkin();
                    saveSettings(); };
                document.getElementById('cancel-call-btn').onclick = hangupCall;
                document.getElementById('minimize-call-btn').onclick = minimizeCall;
                document.getElementById('hangup-btn').onclick = hangupCall;
                // pip and float drag/resize via JS (no inline handlers due to IIFE scope)
                function setupDrag(el, state) {
                    if (!el) return;
                    el.onmousedown = function(e) {
                        if (e.button !== 0) return;
                        if (e.target.closest('button')) return;
                        e.preventDefault();
                        state.isDragging = true;
                        state.startX = e.clientX;
                        state.startY = e.clientY;
                        state.initialX = el.offsetLeft;
                        state.initialY = el.offsetTop;
                        state.target = el;
                        el.style.transition = 'none';
                        el._dragMoved = false;
                    };
                }
                setupDrag(document.getElementById('call-pip-window'), floatWindowDragState);
                setupDrag(document.getElementById('call-float-window'), floatWindowDragState);
                setupDrag(document.getElementById('group-call-pip-window'), groupFloatWindowDragState);
                setupDrag(document.getElementById('group-call-float-window'), groupFloatWindowDragState);
                // pip resize handles
                document.querySelectorAll('.pip-rh').forEach(function(rh) {
                    rh.onmousedown = function(e) { e.stopPropagation();
                        var pip = rh.closest('[id$="pip-window"]');
                        var isGroup = pip && pip.id === 'group-call-pip-window';
                        var rs = isGroup ? groupPipResizeState : pipResizeState;
                        var dir = rh.dataset.dir;
                        rs.isResizing = true; rs.startX = e.clientX; rs.startY = e.clientY;
                        rs.initialW = pip.offsetWidth; rs.initialH = pip.offsetHeight;
                        rs.initialX = pip.offsetLeft; rs.initialY = pip.offsetTop;
                        rs.dir = dir; rs.target = pip; pip.style.transition = 'none';
                    };
                });
                // float window: click to restore (only if not dragged)
                document.getElementById('call-float-window').onclick = function(e) {
                    if (this._dragMoved) return;
                    if (e.target.closest('button')) return;
                    restoreCall();
                };
                document.getElementById('group-call-float-window').onclick = function(e) {
                    if (this._dragMoved) return;
                    if (e.target.closest('button')) return;
                    restoreGroupCall();
                };
                document.getElementById('float-hangup-btn').onclick = e => { e.stopPropagation(); hangupCall(); };
                document.getElementById('pip-hangup-btn').onclick = e => { e.stopPropagation(); hangupCall(); };
                document.getElementById('pip-maximize-btn').onclick = function() { restoreCall(); };
                document.getElementById('pip-minimize-btn').onclick = function(e) { e.stopPropagation(); minimizeCall(); };
                document.getElementById('pip-mute-btn').onclick = function() { callState.muted = !callState.muted; this.innerHTML = callState.muted ? '<i class="fa fa-microphone-slash"></i>' : '<i class="fa fa-microphone"></i>'; this.style.background = callState.muted ? '#ef4444' : ''; this.style.borderColor = callState.muted ? '#ef4444' : ''; };
                document.onmousemove = function(e) {
                    // private pip resize
                    if (pipResizeState.isResizing && pipResizeState.target) {
                        var dx = e.clientX - pipResizeState.startX;
                        var dy = e.clientY - pipResizeState.startY;
                        var el = pipResizeState.target;
                        var dir = pipResizeState.dir;
                        var newW = pipResizeState.initialW, newH = pipResizeState.initialH;
                        var newX = pipResizeState.initialX, newY = pipResizeState.initialY;
                        if (dir.includes('e')) newW = Math.max(160, pipResizeState.initialW + dx);
                        if (dir.includes('w')) { newW = Math.max(160, pipResizeState.initialW - dx); newX = pipResizeState.initialX + (pipResizeState.initialW - newW); }
                        if (dir.includes('s')) newH = Math.max(200, pipResizeState.initialH + dy);
                        if (dir.includes('n')) { newH = Math.max(200, pipResizeState.initialH - dy); newY = pipResizeState.initialY + (pipResizeState.initialH - newH); }
                        el.style.width = newW + 'px';
                        el.style.height = newH + 'px';
                        el.style.left = newX + 'px';
                        el.style.top = newY + 'px';
                        el.style.right = 'auto';
                        el.style.bottom = 'auto';
                        return;
                    }
                    // group pip resize
                    if (groupPipResizeState.isResizing && groupPipResizeState.target) {
                        var dx = e.clientX - groupPipResizeState.startX;
                        var dy = e.clientY - groupPipResizeState.startY;
                        var el = groupPipResizeState.target;
                        var dir = groupPipResizeState.dir;
                        var newW = groupPipResizeState.initialW, newH = groupPipResizeState.initialH;
                        var newX = groupPipResizeState.initialX, newY = groupPipResizeState.initialY;
                        if (dir.includes('e')) newW = Math.max(180, groupPipResizeState.initialW + dx);
                        if (dir.includes('w')) { newW = Math.max(180, groupPipResizeState.initialW - dx); newX = groupPipResizeState.initialX + (groupPipResizeState.initialW - newW); }
                        if (dir.includes('s')) newH = Math.max(240, groupPipResizeState.initialH + dy);
                        if (dir.includes('n')) { newH = Math.max(240, groupPipResizeState.initialH - dy); newY = groupPipResizeState.initialY + (groupPipResizeState.initialH - newH); }
                        el.style.width = newW + 'px';
                        el.style.height = newH + 'px';
                        el.style.left = newX + 'px';
                        el.style.top = newY + 'px';
                        el.style.right = 'auto';
                        el.style.bottom = 'auto';
                        return;
                    }
                    // private float drag
                    if (floatWindowDragState.isDragging && floatWindowDragState.target) {
                        var el = floatWindowDragState.target;
                        var dx = e.clientX - floatWindowDragState.startX;
                        var dy = e.clientY - floatWindowDragState.startY;
                        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) el._dragMoved = true;
                        var left = floatWindowDragState.initialX + dx;
                        var top_ = floatWindowDragState.initialY + dy;
                        left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, left));
                        top_ = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, top_));
                        el.style.left = left + 'px';
                        el.style.top = top_ + 'px';
                        el.style.right = 'auto';
                        el.style.bottom = 'auto';
                    }
                    // group float drag
                    if (groupFloatWindowDragState.isDragging && groupFloatWindowDragState.target) {
                        var el = groupFloatWindowDragState.target;
                        var dx = e.clientX - groupFloatWindowDragState.startX;
                        var dy = e.clientY - groupFloatWindowDragState.startY;
                        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) el._dragMoved = true;
                        var left = groupFloatWindowDragState.initialX + dx;
                        var top_ = groupFloatWindowDragState.initialY + dy;
                        left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, left));
                        top_ = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, top_));
                        el.style.left = left + 'px';
                        el.style.top = top_ + 'px';
                        el.style.right = 'auto';
                        el.style.bottom = 'auto';
                    }
                };
                document.onmouseup = function() {
                    [pipResizeState, groupPipResizeState].forEach(function(rs) {
                        if (rs.isResizing && rs.target) rs.target.style.transition = '';
                        rs.isResizing = false; rs.target = null;
                    });
                    [floatWindowDragState, groupFloatWindowDragState].forEach(function(ds) {
                        if (ds.isDragging && ds.target) ds.target.style.transition = '';
                        ds.isDragging = false; ds.target = null;
                    });
                };
                document.getElementById('call-close-result').onclick = () => { document.getElementById('call-interface')
                        .classList.add('hidden');
                    document.getElementById('call-float-window').classList.add('hidden');
                    document.getElementById('call-pip-window').classList.add('hidden');
                    callState.status = 'idle'; };
                document.getElementById('mute-btn').onclick = () => { callState.muted = !callState.muted;
                    var btn = document.getElementById('mute-btn');
                    btn.innerHTML = callState.muted ? '<i class="fa fa-microphone-slash"></i>' : '<i class="fa fa-microphone"></i>';
                    btn.style.background = callState.muted ? '#ef4444' : '';
                    btn.style.borderColor = callState.muted ? '#ef4444' : ''; };
                var callBgUrls = (settings.callBgs && settings.callBgs.length) ? settings.callBgs : ['https://picsum.photos/800/600?random=call1','https://picsum.photos/800/600?random=call2','https://picsum.photos/800/600?random=call3'];
                var callBgIdx = 0;
                var callBgFileInput = document.createElement('input');
                callBgFileInput.type = 'file';
                callBgFileInput.accept = 'image/*';
                callBgFileInput.style.display = 'none';
                document.body.appendChild(callBgFileInput);
                callBgFileInput.onchange = function(e) {
                    var f = e.target.files[0];
                    if (!f) return;
                    var reader = new FileReader();
                    reader.onload = function(ev) {
                        var dataUrl = ev.target.result;
                        callBgUrls.push(dataUrl);
                        callBgIdx = callBgUrls.length - 1;
                        ['call-active','call-pip-window','group-call-active','group-call-pip-window'].forEach(function(id) {
                            var el = document.getElementById(id);
                            if (el) { el.style.backgroundImage = 'url(' + dataUrl + ')'; el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center'; }
                        });
                        if (!settings.callBgs) settings.callBgs = [];
                        settings.callBgs.push(dataUrl);
                        saveSettings();
                    };
                    reader.readAsDataURL(f);
                    callBgFileInput.value = '';
                };
                var callBgBtn = document.getElementById('call-bg-btn');
                if (callBgBtn) {
                    callBgBtn.onclick = function() {
                        var actions = document.createElement('div');
                        actions.id = 'call-bg-actions';
                        actions.style.cssText = 'position:fixed;bottom:120px;left:50%;transform:translateX(-50%);z-index:85;background:rgba(0,0,0,0.9);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:12px;display:flex;gap:8px;';
                        actions.innerHTML = '<button class="call-bg-action" data-action="upload" style="background:rgba(255,255,255,0.1);color:#fff;border:none;border-radius:10px;padding:8px 16px;font-size:13px;cursor:pointer;">📁 上传图片</button><button class="call-bg-action" data-action="cycle" style="background:rgba(255,255,255,0.1);color:#fff;border:none;border-radius:10px;padding:8px 16px;font-size:13px;cursor:pointer;">🔄 切换背景</button><button class="call-bg-action" data-action="clear" style="background:rgba(255,255,255,0.1);color:#fff;border:none;border-radius:10px;padding:8px 16px;font-size:13px;cursor:pointer;">✕ 清除</button>';
                        document.body.appendChild(actions);
                        setTimeout(function() { var cl = function(ev2) { if (!ev2.target.closest('#call-bg-actions')) { actions.remove(); document.removeEventListener('click', cl); } }; document.addEventListener('click', cl); actions._bgCloser = cl; }, 10);
                        actions.querySelectorAll('.call-bg-action').forEach(function(btn) {
                            btn.onclick = function(ev2) { ev2.stopPropagation();
                                if (this.dataset.action === 'upload') { callBgFileInput.click(); }
                                else if (this.dataset.action === 'cycle') {
                                    callBgIdx = (callBgIdx + 1) % callBgUrls.length;
                                    ['call-active','call-pip-window','group-call-active','group-call-pip-window'].forEach(function(id) {
                                        var el = document.getElementById(id);
                                        if (el) { el.style.backgroundImage = 'url(' + callBgUrls[callBgIdx] + ')'; el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center'; }
                                    });
                                } else if (this.dataset.action === 'clear') {
                                    ['call-active','call-pip-window','group-call-active','group-call-pip-window'].forEach(function(id) {
                                        var el = document.getElementById(id);
                                        if (el) { el.style.backgroundImage = ''; }
                                    });
                                }
                                actions.remove(); if (actions._bgCloser) document.removeEventListener('click', actions._bgCloser);
                            };
                        });
                    };
                }
                (document.getElementById('speaker-btn')||{}).onclick = function() { if (!callState.speakerOn && callState.speakerOn !== false) callState.speakerOn = true; callState.speakerOn = !callState.speakerOn; this.innerHTML = callState.speakerOn ? '<i class="fa fa-volume-up"></i>' : '<i class="fa fa-volume-off"></i>'; this.style.background = callState.speakerOn ? '' : '#ef4444'; this.style.borderColor = callState.speakerOn ? '' : '#ef4444'; };
                (document.getElementById('camera-btn')||{}).onclick = function() { if (!callState.cameraOn && callState.cameraOn !== false) callState.cameraOn = true; callState.cameraOn = !callState.cameraOn; this.innerHTML = callState.cameraOn ? '<i class="fa fa-video-camera"></i>' : '<i class="fa fa-eye-slash"></i>'; this.style.background = callState.cameraOn ? '' : '#ef4444'; this.style.borderColor = callState.cameraOn ? '' : '#ef4444'; };
                document.getElementById('accept-incoming-call').onclick = acceptIncomingCall;
                document.getElementById('reject-incoming-call').onclick = () => { clearTimeout(autoHangup);
                    document.getElementById('incoming-call-panel').classList.add('hidden');
                    callState.status = 'idle';
                    addCallRecord(0, `${settings.myName}拒绝通话`); };
                document.getElementById('accept-incoming-chat').onclick = acceptChatInvite;
                document.getElementById('reject-incoming-chat').onclick = () => document.getElementById(
                        'incoming-chat-panel').classList.add('hidden');
                function minimizeGroupCall() {
                    if (groupCallState.status !== 'connected' && groupCallState.status !== 'calling') return;
                    var gi = document.getElementById('group-call-interface'), gp = document.getElementById('group-call-pip-window'), gf = document.getElementById('group-call-float-window');
                    if (groupCallState.displayMode === 'full') {
                        groupCallState.displayMode = 'pip';
                        groupCallState.minimized = true;
                        gi.classList.add('hidden'); gf.classList.add('hidden');
                        renderGroupPipAvatars();
                        gp.classList.remove('hidden');
                    } else if (groupCallState.displayMode === 'pip') {
                        groupCallState.displayMode = 'bar';
                        gp.classList.add('hidden');
                        gf.classList.remove('hidden');
                        renderGroupFloatAvatars();
                    }
                }
                function restoreGroupCall() {
                    var gi = document.getElementById('group-call-interface'), gp = document.getElementById('group-call-pip-window'), gf = document.getElementById('group-call-float-window');
                    if (groupCallState.displayMode === 'bar') {
                        groupCallState.displayMode = 'pip';
                        gf.classList.add('hidden');
                        renderGroupPipAvatars();
                        gp.classList.remove('hidden');
                    } else if (groupCallState.displayMode === 'pip') {
                        groupCallState.displayMode = 'full';
                        gp.classList.add('hidden');
                        gi.classList.remove('hidden');
                        groupCallState.minimized = false;
                        renderGroupCallActiveMembers();
                    }
                }
                document.getElementById('cancel-group-call-btn').onclick = () => endGroupCall('cancel');
                document.getElementById('minimize-group-call-btn').onclick = minimizeGroupCall;
                document.getElementById('hangup-group-call-btn').onclick = () => { endGroupCall('cancel');
                    document.getElementById('group-call-float-window').classList.add('hidden');
                    document.getElementById('group-call-pip-window').classList.add('hidden'); };
                document.getElementById('group-mute-btn').onclick = () => { groupCallState.muted = !groupCallState
                        .muted;
                    var btn = document.getElementById('group-mute-btn');
                    btn.innerHTML = groupCallState.muted ? '<i class="fa fa-microphone-slash"></i>' : '<i class="fa fa-microphone"></i>';
                    btn.style.background = groupCallState.muted ? '#ef4444' : '';
                    btn.style.borderColor = groupCallState.muted ? '#ef4444' : ''; };
                document.getElementById('group-float-hangup-btn').onclick = e => { e.stopPropagation();
                    endGroupCall('cancel');
                    document.getElementById('group-call-float-window').classList.add('hidden');
                    document.getElementById('group-call-pip-window').classList.add('hidden'); };
                document.getElementById('group-pip-hangup-btn').onclick = e => { e.stopPropagation(); endGroupCall('cancel'); };
                document.getElementById('group-pip-maximize-btn').onclick = function() { restoreGroupCall(); };
                document.getElementById('group-pip-minimize-btn').onclick = function(e) { e.stopPropagation(); minimizeGroupCall(); };
                document.getElementById('group-pip-mute-btn').onclick = function() { groupCallState.muted = !groupCallState.muted; this.innerHTML = groupCallState.muted ? '<i class="fa fa-microphone-slash"></i>' : '<i class="fa fa-microphone"></i>'; this.style.background = groupCallState.muted ? '#ef4444' : ''; this.style.borderColor = groupCallState.muted ? '#ef4444' : ''; };
                document.getElementById('group-call-close-result').onclick = () => { document.getElementById(
                        'group-call-interface').classList.add('hidden');
                    groupCallState.status = 'idle'; };
                document.getElementById('accept-group-call-btn').onclick = acceptGroupCall;
                document.getElementById('reject-group-call-btn').onclick = () => { document.getElementById(
                        'incoming-group-call-panel').classList.add('hidden'); const gid = groupCallState.groupId;
                    const endMsg = { type: 'call', text: `${settings.myName} 拒绝了群通话`, senderId: 'me',
                        groupId: gid, timestamp: new Date().toISOString(), read: true };
                    addData('groupMessages', endMsg).then(id => { endMsg.id = id;
                        groupMessages.push(endMsg);
                        messages = groupMessages; if (currentChatType === 'group' && currentGroupId ===
                            gid) { appendMessageToChat(endMsg);
                            scrollToBottom(); } });
                    groupCallState.status = 'idle'; };
                document.getElementById('partner-avatar-upload').onchange = e => { const f = e.target.files[0]; if (!
                        f) return;
                    compressImage(f, 512, 0.9).then(src => {
                        if (!src) return;
                        const c = getCurrentContact();
                        if (c) { c.avatar = src;
                            document.getElementById('partner-avatar').src = src;
                            var chPa = document.getElementById('ch-partner-avatar');
                            if (chPa) chPa.src = src;
                            updateContact(c);
                            renderContactList();
                            showToast('头像上传成功 ✅'); }
                    });
                    e.target.value = ''; };
                var chPaUp = document.getElementById('ch-partner-avatar-upload');
                if (chPaUp) { chPaUp.onchange = document.getElementById('partner-avatar-upload').onchange; }
                document.getElementById('partner-avatar').ondblclick = function(e) {
                    e.stopPropagation();
                    if (currentChatType === 'private' && currentContactId) {
                        var pats = ['拍了拍你', '戳了你一下', '摸了摸你的头', '轻轻碰了你一下'];
                        sendPat(pats[Math.floor(Math.random() * pats.length)]);
                    }
                };
                document.getElementById('my-avatar').onclick = function() { showMyProfile(); };
                var chMa = document.getElementById('ch-my-avatar');
                if (chMa) chMa.onclick = document.getElementById('my-avatar').onclick;
                document.getElementById('my-avatar-upload').onchange = e => { const f = e.target.files[0]; if (!
                        f) return;
                    compressImage(f, 512, 0.9).then(src => {
                        if (!src) return;
                        settings.myAvatar = src;
                        document.getElementById('my-avatar').src = src;
                        var chMa = document.getElementById('ch-my-avatar');
                        if (chMa) chMa.src = src;
                        saveSettings();
                        showToast('头像上传成功 ✅');
                    });
                    e.target.value = ''; };
                document.getElementById('my-name').onchange = e => { settings.myName = e.target.value.trim() || '我';
                    saveSettings(); };
                document.getElementById('my-status').onchange = e => { settings.myStatus = e.target.value.trim() ||
                        '在线';
                    saveSettings(); };
                chatContainer.addEventListener('click', e => {
                    const quoteBtn = e.target.closest('.quote-btn');
                    if (quoteBtn) { const msgId = parseInt(quoteBtn.dataset.msgid); const msgs =
                            currentChatType === 'group' ? groupMessages : messages; const msg = msgs
                            .find(m => m.id === msgId); if (msg) { if (msg.type === 'pat') { showToast(
                                    '拍一拍消息不可引用'); return; }
                            quotedMessage = msg; const author = currentChatType === 'group' ? (msg
                                .senderId === 'me' ? settings.myName : contacts.find(c => c.id ===
                                    msg.senderId)?.name || '未知') : (msg.isMe ? settings.myName :
                                getCurrentContact()?.name || 'TA');
                            document.getElementById('quote-author').textContent = author; const
                                quoteText = msg.type === 'text' ? msg.text : (msg.type === 'image' ?
                                    '[图片]' : (msg.type === 'voice' ? '[语音]' : '[消息]'));
                            document.getElementById('quote-text').textContent = quoteText;
                            document.getElementById('quote-bar').classList.remove('hidden'); } return; }
                    const delBtn = e.target.closest('.delete-btn');
                    if (delBtn) { const msgId = parseInt(delBtn.dataset.msgid); if (confirm('删除？')) {
                            const store = currentChatType === 'group' ? 'groupMessages' : 'messages';
                            deleteData(store, msgId); if (currentChatType === 'group') { groupMessages =
                                    groupMessages.filter(m => m.id !== msgId);
                                messages = groupMessages; } else { messages = messages.filter(m => m
                                    .id !== msgId);
                                if (cachedContactMessages[currentContactId]) cachedContactMessages[currentContactId] =
                                    cachedContactMessages[currentContactId].filter(m => m.id !== msgId); }
                            const el = chatContainer.querySelector(
                                `[data-id="${msgId}"]`); if (el) el.remove(); } return; }
                    var recallBtn = e.target.closest('.recall-btn');
                    if (recallBtn) {
                        var rId = parseInt(recallBtn.dataset.msgid);
                        if (confirm('撤回该消息？')) {
                            recallMessage(rId);
                            showToast('已撤回');
                        }
                        return;
                    }
                    var jumpEl = e.target.closest('.quote-jump');
                    if (jumpEl) {
                        var targetId = parseInt(jumpEl.dataset.jump);
                        if (targetId) {
                            var targetEl = chatContainer.querySelector('[data-id="' + targetId + '"]');
                            if (targetEl) {
                                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                targetEl.classList.add('highlight-flash');
                                setTimeout(function() { targetEl.classList.remove('highlight-flash'); }, 1500);
                            } else {
                                showToast('原消息已被删除');
                            }
                        }
                        return;
                    }
                });
                chatContainer.addEventListener('dblclick', function(e) {
                    var msgEl = e.target.closest('[data-id]');
                    if (msgEl) {
                        var actions = msgEl.querySelector('.msg-actions');
                        if (actions) {
                            actions.classList.toggle('show');
                            if (actions.classList.contains('show')) {
                                setTimeout(function() { actions.classList.remove('show'); }, 6000);
                            }
                        }
                    }
                });
                document.addEventListener('click', e => {
                    if (!e.target.closest('#emoji-btn') && !e.target.closest('#emoji-drawer')) {
                        document.getElementById('emoji-drawer').classList.remove('show');
                        document.body.classList.remove('emoji-open');
                    }
                    const slide = document.getElementById('settings-slide');
                    if (!e.target.closest('#settings-slide') && !e.target.closest('#settings-btn')) {
                        if (slide && slide.classList.contains('open')) {
                            const rect = slide.getBoundingClientRect();
                            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                                return;
                            }
                        }
                        document.getElementById('settings-subpages').classList.add('hidden');
                        const home = document.getElementById('settings-home');
                        home.classList.remove('hidden');
                        home.style.display = '';
                        document.getElementById('settings-slide').classList.remove('open');
                    }
                    if (!e.target.closest('#mood-calendar-panel') && !e.target.closest('#mood-btn')) {
                        const panel = document.getElementById('mood-calendar-panel');
                        if (panel.classList.contains('open')) {
                            const rect = panel.getBoundingClientRect();
                            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                                return;
                            }
                        }
                        panel.classList.remove('open');
                    }
                });
                setupFloatWindowDrag();
                setupGroupFloatWindowDrag();
                setupVoiceRecordEvents();
                const tabSharedWC = document.getElementById('tab-shared-wordcards');
                if (tabSharedWC) { tabSharedWC.onclick = () => { document.getElementById(
                            'shared-wordcards-content').classList.remove('hidden');
                        document.getElementById('contact-wordcards-content').classList.add('hidden');
                        tabSharedWC.style.borderColor = 'var(--theme)';
                        tabSharedWC.style.color = 'var(--theme)';
                        document.getElementById('tab-contact-wordcards').style.borderColor = 'transparent';
                        document.getElementById('tab-contact-wordcards').style.color =
                        'var(--text-secondary)'; }; }
                const tabContactWC = document.getElementById('tab-contact-wordcards');
                if (tabContactWC) { tabContactWC.onclick = () => { document.getElementById(
                            'shared-wordcards-content').classList.add('hidden');
                        document.getElementById('contact-wordcards-content').classList.remove('hidden');
                        tabContactWC.style.borderColor = 'var(--theme)';
                        tabContactWC.style.color = 'var(--theme)';
                        document.getElementById('tab-shared-wordcards').style.borderColor = 'transparent';
                        document.getElementById('tab-shared-wordcards').style.color =
                        'var(--text-secondary)';
                        renderContactWordCardGroups(); }; }
                const selectWc2 = document.getElementById('contact-select-for-wordcards');
                if (selectWc2) selectWc2.onchange = renderContactWordCardGroups;
                const addGroupBtn2 = document.getElementById('add-contact-wordcard-group');
                if (addGroupBtn2) { addGroupBtn2.onclick = async () => { const select = document.getElementById(
                            'contact-select-for-wordcards'); const cid = select.value; if (!cid) { alert(
                                '请先选择联系人'); return; } const name = prompt('分组名称'); if (name
                            ?.trim()) { const c = contacts.find(c => c.id == cid); if (c) { if (!
                                    c.uniqueWordCardGroups) c.uniqueWordCardGroups = [];
                                c.uniqueWordCardGroups.push({ name: name.trim(), cards: [],
                                    enabled: true, blockedCards: [] });
                                await updateContact(c);
                                renderContactWordCardGroups(); } } }; }
                const backWC = document.getElementById('back-to-wordcards');
                if (backWC) { backWC.onclick = () => { document.getElementById('wordcard-manage-panel')
                            .classList.remove('open');
                        document.getElementById('settings-slide').classList.add('open'); }; }
                renderMoodSelectorGrid();
            } catch (e) {
                console.error('setupEventListeners \u9519\u8bef:', e, e && e.stack);
                showToast('\u90e8\u5206\u5143\u7d20\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u5237\u65b0\u9875\u9762');
            }
            }

            function updateUI() {
                document.getElementById('my-avatar').src = settings.myAvatar;
                var chMa = document.getElementById('ch-my-avatar');
                if (chMa) chMa.src = settings.myAvatar;
                document.getElementById('my-name').value = settings.myName;
                document.getElementById('my-status').value = settings.myStatus;
                const contact = getCurrentContact();
                if (contact) { document.getElementById('partner-avatar').src = contact.avatar;
                    var chPa = document.getElementById('ch-partner-avatar');
                    if (chPa) chPa.src = contact.avatar;
                    document.getElementById('partner-name').textContent = contact.name;
                    document.getElementById('partner-status').textContent = contact.status; }
                applySkin();
                applyAvatarEffects();
                if (typeof messages !== 'undefined' && messages.length >= 0) renderMessages();
                renderLetterList();
                startStatusTimersForAll();
                startActiveMsgTimer();
                renderMoodCalendar();
                renderMoodEmojiPicker();
                renderPatDrawer();
                renderContactList();
            }

            async function loadAllData() {
                contacts = await safeGetAll('contacts');
                groups = await safeGetAll('groups');
                wordCardGroups = await safeGetAll('wordCards');
                emojis = await safeGetAll('emojis');
                periodRecords = await safeGetAll('periodRecords');
                periodCycles = await safeGetAll('periodCycles');

                let s = [];
                try { s = await getAllData('settings'); } catch (e) {}
                if (s.length) settings = { ...settings, ...s[0].value };
                emojiChars = settings.emojiChars || [...DEFAULT_EMOJI_CHARS];
                kaomojiChars = settings.kaomojiChars || [...DEFAULT_KAOMOJI_CHARS];
                if (!settings.moodSymbols?.length) settings.moodSymbols = DEFAULT_MOOD_SYMBOLS;
                if (!settings.myMoodHistory) settings.myMoodHistory = [];
                if (!settings.patLibrary) settings.patLibrary = [...DEFAULT_PAT_LIBRARY];
                if (!settings.partnerPatGroups) settings.partnerPatGroups = [];
                if (!settings.statusLibrary) settings.statusLibrary = [...DEFAULT_STATUS_LIBRARY];
                if (!settings.bgEffects) settings.bgEffects = { enabled: true };
                if (!settings.pendingLetterReplies) settings.pendingLetterReplies = [];
                if (settings.replyPatChance === undefined) settings.replyPatChance = 0.07;
                if (settings.replyCallChance === undefined) settings.replyCallChance = 0.03;
                if (settings.postReplyMin === undefined) settings.postReplyMin = 300;
                if (settings.postReplyMax === undefined) settings.postReplyMax = 21600;
                if (settings.commentReplyMin === undefined) settings.commentReplyMin = 180;
                if (settings.commentReplyMax === undefined) settings.commentReplyMax = 1800;
                if (settings.commentReplyChance === undefined) settings.commentReplyChance = 1.0;
                if (settings.voiceReplyChance === undefined) settings.voiceReplyChance = 0.06;
                if (!settings.generalVoiceGroups) settings.generalVoiceGroups = [];
                // ===== 初始化新增设置 =====
                if (settings.maxCardsPerReplyUser === undefined) settings.maxCardsPerReplyUser = 4;
                if (settings.readReceiptEnabled === undefined) settings.readReceiptEnabled = false;
                if (settings.readReceiptChance === undefined) settings.readReceiptChance = 0.2;
                if (settings.partnerLetterEnabled === undefined) settings.partnerLetterEnabled = true;
                if (settings.combineCardsEnabled === undefined) settings.combineCardsEnabled = true;
                if (settings.combineCardsChance === undefined) settings.combineCardsChance = 0.3;
                if (settings.combineCardsMin === undefined) settings.combineCardsMin = 2;
                if (settings.combineCardsMax === undefined) settings.combineCardsMax = 4;

                if (!settings.period) {
                    settings.period = {
                        reminders: {
                            periodStart: true,
                            periodEnd: true,
                            ovulation: false,
                            nextPeriod: true,
                            daysBefore: 2,
                            time: '08:00'
                        },
                        customMessages: {
                            periodStart: '大姨妈快来了，包包里放片卫生巾吧 🌸',
                            periodEnd: '经期结束了，可以吃点好的补补 💪'
                        },
                        privacy: {
                            passwordEnabled: false,
                            password: null
                        },
                        averageCycle: 28,
                        averagePeriod: 5,
                        lastPeriodStart: null,
                        lastPeriodEnd: null
                    };
                }

                wordCardGroups.forEach(g => { if (!g.blockedCards) g.blockedCards = []; });
                contacts.forEach(c => { if (c.uniqueWordCardGroups) { c.uniqueWordCardGroups.forEach(g => { if (!
                g.blockedCards) g.blockedCards = []; }); } if (c.partnerMoodIndex === undefined) c.partnerMoodIndex = 50 + Math.floor(Math.random() * 50); if (c.timezoneOffset === undefined) c.timezoneOffset = 8; if (c.timeFlowSpeed === undefined) c.timeFlowSpeed = 1; if (!c.replySettings) c.replySettings = defaultReplySettings(); else { var _def = defaultReplySettings(); Object.keys(_def).forEach(function(k) { if (c.replySettings[k] === undefined) c.replySettings[k] = _def[k]; }); } });
                if (contacts.length === 0) { await addContact({ name: 'TA', avatar: 'https://picsum.photos/200/200?random=1' }); }
                currentContactId = contacts[0]?.id;
                if (groups.length === 0 && contacts.length > 0) { await createGroup('默认群聊', contacts.map(c => c.id)); }
                try { posts = await getAllData('posts'); } catch (e) { posts = []; }
            }

            async function safeGetAll(storeName) { try { return await getAllData(storeName); } catch (e) { return []; } }

            async function initApp() {
                try {
                    await initDB();
                    await loadAllData();
                    updateUI();
                    setupEventListeners();
                    renderContactList();
                    document.body.classList.add('home-view');
                    document.getElementById('chat-view').classList.remove('open');
                    var backBtn = document.getElementById('back-to-home-btn');
                    if (backBtn) backBtn.classList.add('hidden');
                    document.getElementById('chat-header')?.classList.add('hidden');
                    document.getElementById('home-header-content')?.classList.remove('hidden');
                    schedulePartnerRead();
                    startStatusTimersForAll();
                    startPartnerLetterTimer();
                    startMomentTimers();
                    startPartnerCallTimer();
                    startChatInviteTimer();
                    startMoodRefreshTimer();
                    startMoodIndexTimer();
                    startBatteryMonitor();
                    updateMyMoodDisplay();
                    updateHeaderClock();
                    setInterval(updateHeaderClock, 30000);
                    processPendingLetterReplies();
                    console.log('LOVE · 多联系人治愈版 初始化完成 ✅');
                    window.__appReady = true;
                    var ld2 = document.getElementById('app-loading');
                    if (ld2) ld2.style.display = 'none';
                } catch (err) {
                    const msg = '初始化失败：' + err.message + '\n\n' + err.stack;
                    document.body.innerHTML =
                        '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:#fff;color:red;padding:20px;overflow:auto;z-index:9999;white-space:pre-wrap;font-size:16px;">' +
                        msg + '</div>';
                    window.__appReady = true;
                }
            }
            // ---- 导出 LOVE API 供外部模块使用 ----
            window.LOVE = window.LOVE || {};
            var _api = window.LOVE;
            _api.sendMessage = sendMessage;
            _api.sendVoiceMessage = sendVoiceMessage;
            _api.startCall = startCall;
            _api.startGroupCall = startGroupCall;
            _api.renderEmojiDrawer = renderEmojiDrawer;
            _api.switchEmojiTab = switchEmojiTab;
            _api.compressImage = compressImage;
            _api.sendStickerMsg = sendStickerMsg;
            _api.showToast = showToast;
            _api.renderPatDrawer = renderPatDrawer;
            _api.currentChatType = function() { return currentChatType; };
            _api.getCurrentContact = function() { return getCurrentContact(); };
            _api.openMoodPanel = function() { var p = document.getElementById('mood-calendar-panel'); if (p) p.classList.add('open'); switchModule('mood'); };
            _api.openPeriodPanel = function() { var p = document.getElementById('mood-calendar-panel'); if (p) p.classList.add('open'); switchModule('period'); markPeriodRecordsViewed(); };
            _api.openContactList = function() { showHomeView(); };
            _api.openMoments = function() { var p = document.getElementById('moments-panel'); if (p) p.classList.add('open'); renderMoments(); };
            _api.openLetter = function() { var p = document.getElementById('letter-inbox'); if (p) p.classList.add('open'); renderLetterList(); };
            _api.openSettings = function() { var ss = document.getElementById('settings-slide'); if (ss) ss.classList.add('open'); };
            _api.toggleDarkMode = function() { settings.darkMode = !settings.darkMode; applySkin(); saveSettings(); };
            _api.openAppearance = function() { var ss = document.getElementById('settings-slide'); if (ss) ss.classList.add('open'); setTimeout(function() { var at = document.querySelector('.folder-tab[data-page="appearance"]'); if (at) at.click(); }, 100); };
            _api.openFileManager = function() { var ss = document.getElementById('settings-slide'); if (ss) ss.classList.add('open'); setTimeout(function() { var at = document.querySelector('.folder-tab[data-page="wordcards"]'); if (at) at.click(); }, 100); };
            function showHomeView() {
                document.body.classList.add('home-view');
                var _hdr3 = document.getElementById('header'); if (_hdr3) { _hdr3.classList.add('hidden'); _hdr3.style.display = 'none'; }
                document.getElementById('chat-view').classList.remove('open');
                var backBtn = document.getElementById('back-to-home-btn');
                if (backBtn) backBtn.classList.add('hidden');
                renderContactList();
                document.getElementById('contact-switcher')?.classList.add('hidden');
                document.querySelector('label[for="partner-avatar-upload"]')?.classList.add('hidden');
            }
            _api.showHomeView = showHomeView;
            window.closeAddSheet = function() { var s = document.getElementById('add-action-sheet'); if (s) s.classList.add('hidden'); };
            window.handleAddContact = function() { closeAddSheet(); var name = prompt('输入联系人昵称'); if (name && name.trim()) { addContact({ name: name.trim() }).then(function(c) { renderContactList(); switchContact(c.id); }); } };
            window.handleCreateGroup = function() { closeAddSheet(); var name = prompt('输入群聊名称'); if (name && name.trim()) { var selected = contacts.filter(function(c) { return confirm('邀请 ' + c.name + ' 加入群聊？'); }); if (selected.length) { createGroup(name.trim(), selected.map(function(c) { return c.id; })).then(function(g) { renderContactList(); switchGroup(g.id); }); } } };
            function showMyProfile() {
                var contact = getCurrentContact();
                var panel = document.getElementById('contact-home-panel');
                document.getElementById('ch-avatar').src = settings.myAvatar;
                document.getElementById('ch-name').textContent = settings.myName;
                document.getElementById('ch-status').textContent = settings.myStatus || '在线';
                document.getElementById('ch-nickname').textContent = settings.myName;
                document.getElementById('ch-card-count').textContent = '你';
                var content = document.getElementById('contact-home-content');
                content.innerHTML = '';
                var html = '<div class="text-center mb-4"><img src="' + escapeHtml(settings.myAvatar) + '" class="w-20 h-20 rounded-full mx-auto mb-2 border-4 shadow-md"><h3 class="text-lg font-bold text-[var(--text-primary)]">' + escapeHtml(settings.myName) + '</h3><p class="text-xs text-[var(--text-secondary)]">' + escapeHtml(settings.myStatus || '在线') + '</p></div>';
                html += '<div class="grid grid-cols-2 gap-2 mb-4">';
                html += '<button id="my-change-avatar-btn" class="flex flex-col items-center gap-0.5 py-2 bg-[var(--theme-light)] rounded-lg text-xs"><i class="fa fa-camera text-base"></i><span>更换头像</span></button>';
                html += '<button id="my-view-moments-btn" class="flex flex-col items-center gap-0.5 py-2 bg-[var(--theme-light)] rounded-lg text-xs"><i class="fa fa-circle-o text-base"></i><span>我的朋友圈</span></button>';
                html += '</div>';
                html += '<button id="my-close-btn" class="w-full py-2 bg-[var(--theme-light)] rounded-xl text-sm">关闭</button>';
                content.innerHTML = html;
                document.getElementById('my-change-avatar-btn').onclick = function() {
                    var input = document.createElement('input');
                    input.type = 'file'; input.accept = 'image/*';
                    input.onchange = function(e) {
                        var f = e.target.files[0];
                        if (!f) return;
                        compressImage(f, 512, 0.9).then(function(src) {
                            if (!src) return;
                            settings.myAvatar = src;
                            document.getElementById('my-avatar').src = src;
                            document.getElementById('ch-avatar').src = src;
                            saveSettings();
                            showToast('头像已更新 ✅');
                        });
                    };
                    input.click();
                };
                document.getElementById('my-view-moments-btn').onclick = function() {
                    panel.classList.remove('open');
                    var momentsPanel = document.getElementById('moments-panel');
                    if (momentsPanel) {
                        momentsPanel.classList.add('open');
                        renderMyMomentsOnly();
                    }
                };
                document.getElementById('my-close-btn').onclick = function() { panel.classList.remove('open'); };
                panel.classList.add('open');
            }
            function renderMyMomentsOnly() {
                var list = document.getElementById('moments-list');
                if (!list) return;
                list.innerHTML = '';
                var myPosts = posts.filter(function(p) { return p.authorId === 'me' || p.isMe; });
                if (!myPosts.length) {
                    list.innerHTML = '<div class="text-center text-[var(--text-secondary)] py-8">你还没有发过朋友圈</div>';
                    return;
                }
                myPosts.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
                myPosts.forEach(function(post) {
                    var card = document.createElement('div');
                    card.className = 'moment-card flex items-start p-3';
                    var avatarImg = document.createElement('img');
                    avatarImg.className = 'm-avatar';
                    avatarImg.src = settings.myAvatar;
                    card.appendChild(avatarImg);
                    var contentDiv = document.createElement('div');
                    contentDiv.className = 'm-content';
                    contentDiv.innerHTML = '<p class="m-author">' + escapeHtml(settings.myName) + '</p><p class="m-text">' + escapeHtml(post.text || '') + '</p>';
                    if (post.images && post.images.length) {
                        var imgGrid = document.createElement('div');
                        imgGrid.className = 'm-images';
                        post.images.forEach(function(imgSrc) {
                            var img = document.createElement('img');
                            img.src = imgSrc;
                            img.onclick = function(e) { e.stopPropagation(); showImageLightbox(imgSrc); };
                            imgGrid.appendChild(img);
                        });
                        contentDiv.appendChild(imgGrid);
                    }
                    var footer = document.createElement('div');
                    footer.className = 'm-footer';
                    footer.innerHTML = '<span class="m-time">' + formatDate(post.timestamp) + '</span>';
                    contentDiv.appendChild(footer);
                    card.appendChild(contentDiv);
                    list.appendChild(card);
                });
            }
            function renderContactMomentsOnly() {
                var contact = getCurrentContact();
                if (!contact) return;
                var list = document.getElementById('moments-list');
                if (!list) return;
                var bannerName = document.getElementById('moments-banner-name');
                if (bannerName) bannerName.textContent = contact.name;
                var bannerAvatar = document.getElementById('moments-banner-avatar');
                if (bannerAvatar) bannerAvatar.src = contact.avatar;
                var bannerImg = document.getElementById('moments-banner-img');
                if (bannerImg) bannerImg.src = settings.momentsBg || 'https://picsum.photos/800/300?random=99';
                list.innerHTML = '';
                var contactPosts = posts.filter(function(p) { return p.authorId === contact.id && !p.isMe; });
                if (!contactPosts.length) {
                    list.innerHTML = '<div class="text-center text-[var(--text-secondary)] py-8">' + escapeHtml(contact.name) + ' 还没有发过朋友圈</div>';
                    return;
                }
                contactPosts.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
                contactPosts.forEach(function(post) {
                    var card = document.createElement('div');
                    card.className = 'moment-card flex items-start p-3';
                    var avatarImg = document.createElement('img');
                    avatarImg.className = 'm-avatar';
                    avatarImg.src = contact.avatar;
                    card.appendChild(avatarImg);
                    var contentDiv = document.createElement('div');
                    contentDiv.className = 'm-content';
                    contentDiv.innerHTML = '<p class="m-author">' + escapeHtml(contact.name) + '</p><p class="m-text">' + escapeHtml(post.text || '') + '</p>';
                    if (post.images && post.images.length) {
                        var imgGrid = document.createElement('div');
                        imgGrid.className = 'm-images';
                        post.images.forEach(function(imgSrc) {
                            var img = document.createElement('img');
                            img.src = imgSrc;
                            img.onclick = function(e) { e.stopPropagation(); showImageLightbox(imgSrc); };
                            imgGrid.appendChild(img);
                        });
                        contentDiv.appendChild(imgGrid);
                    }
                    var footer = document.createElement('div');
                    footer.className = 'm-footer';
                    footer.innerHTML = '<span class="m-time">' + formatDate(post.timestamp) + '</span>';
                    contentDiv.appendChild(footer);
                    card.appendChild(contentDiv);
                    list.appendChild(card);
                });
            }
            _api.showMyProfile = showMyProfile;
            var homeBtn2 = document.getElementById('back-to-home-btn'); if (homeBtn2) homeBtn2.onclick = function() {
                showHomeView();
            };
            try { initApp(); } catch (e) {
                var _topMsg = '\u9876\u5c42\u6267\u884c\u9519\u8bef\uff1a' + (e && e.message || String(e));
                console.error(_topMsg);
                var _ld = document.getElementById('app-loading');
                if (_ld) _ld.innerHTML = '<div style="text-align:center;color:red;padding:40px;font-size:14px;">' + _topMsg + '</div>';
                window.__appReady = true;
            }
        })();

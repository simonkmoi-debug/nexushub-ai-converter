const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatView = document.querySelector('.custom-scroll');

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userText = chatInput.value.trim();
    if (!userText) return;

    // Append user message UI bubble
    chatView.innerHTML += `
        <div class="flex gap-3 max-w-[85%] ml-auto justify-end">
            <div class="bg-blue-600 p-3 rounded-2xl rounded-tr-none text-xs text-white leading-relaxed">
                ${userText}
            </div>
        </div>`;
    
    chatInput.value = '';
    chatView.scrollTop = chatView.scrollHeight;

    try {
        // Call backend server api
        const res = await fetch('/api/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userText })
        });
        const data = await res.json();

        // Append AI structural response bubble
        chatView.innerHTML += `
            <div class="flex gap-3 max-w-[85%]">
                <div class="h-7 w-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center flex-shrink-0 text-xs">
                    <i class="fa-solid fa-robot"></i>
                </div>
                <div class="bg-white/5 border border-slate-800/80 p-3 rounded-2xl rounded-tl-none text-xs text-slate-300 leading-relaxed">
                    ${data.response}
                </div>
            </div>`;
        chatView.scrollTop = chatView.scrollHeight;
    } catch (err) {
        console.error("AI node communication error:", err);
    }
});
<!DOCTYPE html>
<html class="dark">
<head>
    <title>Forgot Password</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .glass {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
    </style>
</head>
<body class="bg-black flex items-center justify-center h-screen font-sans p-4">
    <div class="glass p-8 rounded-xl shadow-2xl w-full max-w-sm">
        <h2 class="text-2xl text-yellow-400 font-bold mb-4 text-center">Reset Password</h2>
        <p class="text-gray-400 text-sm mb-6 text-center">Enter your registered email address to receive a reset link.</p>
        
        <form id="forgotForm" class="space-y-6">
            <div>
                <label class="block text-gray-300 mb-2 text-sm uppercase tracking-wide">Email</label>
                <input type="email" id="email" required class="w-full p-3 rounded bg-gray-900/50 text-white border border-gray-700 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition">
            </div>
            <button type="submit" class="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold p-3 rounded transition shadow-lg hover:shadow-yellow-400/20">Send Link</button>
        </form>
        
        <p id="message" class="text-green-400 mt-4 text-center hidden font-bold text-sm"></p>
        
        <div class="mt-6 text-center">
            <a href="portal-access-99.php" class="text-gray-500 hover:text-white text-sm transition">Back to Login</a>
        </div>
    </div>
    
    <script>
        document.getElementById('forgotForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const btn = e.target.querySelector('button');
            const originalText = btn.textContent;
            
            btn.textContent = 'Sending...';
            btn.disabled = true;
            
            try {
                const res = await fetch('admin_backend.php?action=forgot_password', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({email: email})
                });
                
                const data = await res.json();
                const msg = document.getElementById('message');
                msg.textContent = data.message || 'If valid, email sent.';
                msg.classList.remove('hidden');
                msg.className = data.success ? "text-green-400 mt-4 text-center font-bold text-sm" : "text-red-500 mt-4 text-center font-bold text-sm";
                
            } catch (err) {
                alert('Connection error');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    </script>
</body>
</html>

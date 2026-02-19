<?php
$token = $_GET['token'] ?? '';
?>
<!DOCTYPE html>
<html class="dark">
<head>
    <title>Set New Password</title>
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
        <h2 class="text-2xl text-yellow-400 font-bold mb-4 text-center">New Password</h2>
        
        <form id="resetForm" class="space-y-6">
            <input type="hidden" id="token" value="<?php echo htmlspecialchars($token); ?>">
            <div>
                <label class="block text-gray-300 mb-2 text-sm uppercase tracking-wide">New Password</label>
                <input type="password" id="password" required class="w-full p-3 rounded bg-gray-900/50 text-white border border-gray-700 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition">
            </div>
             <div>
                <label class="block text-gray-300 mb-2 text-sm uppercase tracking-wide">Confirm Password</label>
                <input type="password" id="confirm_password" required class="w-full p-3 rounded bg-gray-900/50 text-white border border-gray-700 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition">
            </div>
            <button type="submit" class="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold p-3 rounded transition shadow-lg hover:shadow-yellow-400/20">Update Password</button>
        </form>
        
         <p id="message" class="text-red-500 mt-4 text-center hidden font-bold text-sm"></p>
    </div>
    
    <script>
        document.getElementById('resetForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const p1 = document.getElementById('password').value;
            const p2 = document.getElementById('confirm_password').value;
            const token = document.getElementById('token').value;
            const msg = document.getElementById('message');
            
            if (p1 !== p2) {
                msg.textContent = "Passwords do not match";
                msg.classList.remove('hidden');
                return;
            }
            
            const btn = e.target.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = 'Updating...';
            btn.disabled = true;
            
            try {
                const res = await fetch('admin_backend.php?action=reset_password', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({token: token, password: p1})
                });
                
                const data = await res.json();
                
                if (data.success) {
                    alert('Password updated! Redirecting to login...');
                    window.location.href = 'portal-access-99.php';
                } else {
                    msg.textContent = data.error || 'Failed to update';
                    msg.classList.remove('hidden');
                }
                
            } catch (err) {
                msg.textContent = 'Connection Error';
                msg.classList.remove('hidden');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    </script>
</body>
</html>

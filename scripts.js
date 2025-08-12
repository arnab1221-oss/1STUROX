// Replace the placeholders below with your real values
const OWNER_EMAIL = 'OWNER_EMAIL'; // example: 'youremail@example.com'
const WHATSAPP_NUMBER = '919999999999'; // in international format without + (e.g. 919876543210 for India)

// Common helpers to set owner contact links
document.addEventListener('DOMContentLoaded', ()=>{
  const emailLink = document.getElementById('owner-email');
  if(emailLink) emailLink.href = `mailto:${OWNER_EMAIL}`;

  const waLink = document.getElementById('whatsapp-link');
  if(waLink){
    const text = encodeURIComponent('Hello, I want to contact regarding Campus Print.');
    waLink.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
    waLink.target = '_blank';
  }

  // Upload page behavior
  const uploadForm = document.getElementById('upload-form');
  if(uploadForm){
    uploadForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const files = document.getElementById('file-input').files;
      const name = document.getElementById('student-name').value;
      const roll = document.getElementById('student-roll').value;
      const resultDiv = document.getElementById('upload-result');

      if(!files || files.length===0){ resultDiv.textContent = 'Please choose at least one file.'; return; }

      // Build FormData to send to your server endpoint
      const fd = new FormData();
      fd.append('name', name);
      fd.append('roll', roll);
      for(let i=0;i<files.length;i++) fd.append('files', files[i]);

      resultDiv.textContent = 'Uploading...';

      try{
        // TODO: Replace /upload with your real server endpoint that handles file uploads
        const resp = await fetch('/upload', { method: 'POST', body: fd });

        if(resp.ok){
          const json = await resp.json().catch(()=>({message:'Uploaded (no JSON returned)'}));
          // Store a lightweight order context for the next page (print.html)
          localStorage.setItem('campusprint_uploaded', JSON.stringify({name,roll,files:Array.from(files).map(f=>f.name)}));

          // OPTIONAL: open WhatsApp with a prefilled message for owner (user still needs to tap send)
          const waMsg = `New upload from ${name || 'unknown'}${roll?(' (ID:'+roll+')'):''}. Files: ${Array.from(files).map(f=>f.name).join(', ')}`;
          // open in new tab
          window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`,'_blank');

          resultDiv.textContent = 'Upload successful. Redirecting to Place Order...';
          setTimeout(()=> location.href = 'print.html', 1200);
        } else {
          // If you don't have a backend yet, simulate success for demo purposes
          console.warn('Upload endpoint returned non-OK. Simulating success for demo.');
          localStorage.setItem('campusprint_uploaded', JSON.stringify({name,roll,files:Array.from(files).map(f=>f.name)}));
          window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('New upload - ' + Array.from(files).map(f=>f.name).join(', '))}`,'_blank');
          resultDiv.textContent = 'Simulated upload (no server). Redirecting to Place Order...';
          setTimeout(()=> location.href = 'print.html', 1200);
        }
      }catch(err){
        console.error(err);
        // Simulate success if running locally without backend
        localStorage.setItem('campusprint_uploaded', JSON.stringify({name,roll,files:Array.from(files).map(f=>f.name)}));
        resultDiv.textContent = 'Unable to reach upload server. Saved locally for demo and redirected.';
        setTimeout(()=> location.href = 'print.html', 1200);
      }
    });
  }

  // Print page behavior
  const orderForm = document.getElementById('order-form');
  if(orderForm){
    // preload name if saved
    const ctx = JSON.parse(localStorage.getItem('campusprint_uploaded')||'null');
    if(ctx && ctx.name) document.getElementById('order-name').value = ctx.name;
    if(ctx && ctx.roll) document.getElementById('order-roll').value = ctx.roll;

    const bwInput = document.getElementById('bw-pages');
    const colorInput = document.getElementById('color-pages');
    const totalSpan = document.getElementById('total-amount');

    function updateTotal(){
      const bw = Number(bwInput.value||0);
      const col = Number(colorInput.value||0);
      const total = bw*3 + col*5;
      totalSpan.textContent = total;
    }
    bwInput.addEventListener('input', updateTotal);
    colorInput.addEventListener('input', updateTotal);
    updateTotal();

    orderForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const name = document.getElementById('order-name').value;
      const roll = document.getElementById('order-roll').value;
      const bw = Number(document.getElementById('bw-pages').value||0);
      const col = Number(document.getElementById('color-pages').value||0);
      const total = bw*3 + col*5;

      // Build order object
      const order = {
        id: 'ORD' + Date.now(),
        name, roll, bw, color: col, total,
        uploadedFiles: JSON.parse(localStorage.getItem('campusprint_uploaded')||'null')?.files || []
      };

      // TODO: POST order to your backend e.g. /submit-order
      try{
        const resp = await fetch('/submit-order', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(order)});
        if(resp.ok){
          document.getElementById('order-result').textContent = 'Order submitted successfully. Order ID: ' + order.id;
          localStorage.setItem('campusprint_lastorder', JSON.stringify({order, status:'ordered'}));

          // Open WhatsApp to notify owner (user needs to press send in WhatsApp)
          const waMsg = `New order ${order.id} from ${name || 'unknown'}. B/W:${bw} Color:${col} Total:Rs.${total}. Files: ${order.uploadedFiles.join(', ')}`;
          window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`,'_blank');

          // Update order-status display
          document.getElementById('order-status').textContent = 'Ordered — waiting for confirmation';
        } else {
          // Simulate success if no backend
          console.warn('submit-order endpoint non-ok. Simulating success.');
          document.getElementById('order-result').textContent = 'Order simulated (no backend). Order ID: ' + order.id;
          localStorage.setItem('campusprint_lastorder', JSON.stringify({order, status:'ordered'}));
          window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('New order ' + order.id)}`,'_blank');
          document.getElementById('order-status').textContent = 'Ordered — waiting for confirmation (simulated)';
        }
      }catch(err){
        console.error(err);
        document.getElementById('order-result').textContent = 'Cannot reach server. Order saved locally as demo. Order ID: ' + order.id;
        localStorage.setItem('campusprint_lastorder', JSON.stringify({order, status:'ordered-local'}));
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('New order ' + order.id)}`,'_blank');
        document.getElementById('order-status').textContent = 'Ordered (local demo)';
      }
    });

    // If an order exists in localStorage, show status
    const last = JSON.parse(localStorage.getItem('campusprint_lastorder')||'null');
    if(last){
      document.getElementById('order-status').textContent = `${last.order.id} — ${last.status}`;
    }
  }
});

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

function draw() 
{
    ctx.clearRect(0,0,W,H);
    ctx.save();
    ctx.globalAlpha = 0.9;
    const t = performance.now()/1000;

    for (let y=0; y<H; y+=20) 
    {
        ctx.strokeStyle = `rgba(167,139,250,0.06)`; 
        ctx.beginPath(); 
        ctx.moveTo(0,y+Math.sin((y+t)*0.5)*2); 
        ctx.lineTo(W,y+Math.sin((y+t)*0.5)*2); 
        ctx.stroke();
    }
    
    ctx.restore();
}
from PIL import Image, ImageDraw, ImageFont
for size in [192, 512]:
    img = Image.new('RGB', (size, size), '#C0392B')
    d = ImageDraw.Draw(img)
    m = int(size * 0.12)
    d.rounded_rectangle([m, m, size-m, size-m], radius=int(size*0.18), fill='#1B3A5C')
    fs1 = int(size * 0.18)
    fs2 = int(size * 0.12)
    try:
        f1 = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", fs1)
        f2 = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", fs2)
    except:
        f1 = ImageFont.load_default()
        f2 = ImageFont.load_default()
    bb = d.textbbox((0,0), "ICANS", font=f1)
    d.text(((size-(bb[2]-bb[0]))//2, int(size*0.25)), "ICANS", fill='white', font=f1)
    bb2 = d.textbbox((0,0), "GRADING", font=f2)
    d.text(((size-(bb2[2]-bb2[0]))//2, int(size*0.48)), "GRADING", fill='#D6E4F0', font=f2)
    # severity bars
    bw = int(size*0.5)
    bx = (size-bw)//2
    by = int(size*0.72)
    bh = int(size*0.04)
    bg = int(size*0.02)
    colors = ['#27ae60','#f39c12','#e67e22','#c0392b']
    widths = [0.4, 0.6, 0.8, 1.0]
    for i,c in enumerate(colors):
        w = int(bw*widths[i])
        d.rounded_rectangle([bx, by+i*(bh+bg), bx+w, by+i*(bh+bg)+bh], radius=bh//2, fill=c)
    img.save(f'/home/claude/icans-grading-pwa/icons/icon-{size}.png')
    print(f'icon-{size}.png created')

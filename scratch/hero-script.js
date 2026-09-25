    (async function() {
      const wrapper = document.getElementById('hero-slides-wrapper');
      const dotsContainer = document.getElementById('hero-dots');
      if (!wrapper) return;
      try {
        const res = await apiGet('/admin/hero-slides');
        const ids = res.slides || [];
        if (!ids.length) { wrapper.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#000000;background:#ffffff;">No collections pinned</div>'; return; }
        const data = await apiGet('/products');
        const allProds = data.products || [];
        const slides = ids.map(id => allProds.find(p => p.id === id)).filter(Boolean);
        if (!slides.length) { wrapper.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#000000;background:#ffffff;">No collections pinned</div>'; return; }
        
        const mobileHtml = slides.map((p, i) => {
          const hasVideo = !!p.video;
          const hasImage = p.images && p.images.length > 0;
          const bgImg = hasImage ? p.images[0] : '';
          let visualHtml = '';
          if (hasVideo) { visualHtml = `<video src="${p.video}" autoplay muted loop playsinline></video>`; }
          else if (hasImage) { visualHtml = `<img src="${bgImg}" alt="${p.name}" />`; }
          else { visualHtml = `<div class="no-visual">${p.emoji || '?'}</div>`; }
          return `
            <div class="hero-slide ${i === 0 ? 'active' : ''}">
              <div class="hero-bg-layer" style="background-image: url('${bgImg}');"></div>
              <div class="hero-video-overlay"></div>
              <div class="hero-layout">
                <div class="hero-text-side"><h2 class="hero-super-heading">Elegance in Motion</h2>
                  <p class="hero-title-main">${p.name}</p>
                  <p class="hero-title-sub" style="margin-top:10px;color:#000000;">PKR ${Number(p.price).toLocaleString()}</p>
                  <a href="product.html?id=${p.id}" class="btn btn-primary" style="margin-top:20px;display:inline-block;">Shop Now</a>
                </div>
                <div class="hero-visual-side">${visualHtml}</div>
              </div>
            </div>`;
        }).join('');

        const desktopTexts = slides.map((p, i) => `
          <div class="desktop-text-card ${i === 0 ? 'active' : ''}" data-idx="${i}">
            <h2 class="hero-super-heading">Elegance in Motion</h2>
            <p class="hero-title-main">${p.name}</p>
            <p class="hero-title-sub" style="margin-top:10px;color:#000000;">PKR ${Number(p.price).toLocaleString()}</p>
            <a href="product.html?id=${p.id}" class="btn btn-primary" style="margin-top:20px;display:inline-block;">Shop Now</a>
          </div>
        `).join('');

        const desktopVisuals = slides.map((p, i) => {
          const hasVideo = !!p.video;
          const hasImage = p.images && p.images.length > 0;
          let visualHtml = '';
          if (hasVideo) { visualHtml = `<video src="${p.video}" autoplay muted loop playsinline></video>`; }
          else if (hasImage) { visualHtml = `<img src="${p.images[0]}" alt="${p.name}" />`; }
          else { visualHtml = `<div class="no-visual">${p.emoji || '?'}</div>`; }
          return `<div class="desktop-3d-card" data-idx="${i}">${visualHtml}</div>`;
        }).join('');

        const desktopHtml = `
          <div class="hero-layout">
             <div class="hero-text-side desktop-text-wrapper" style="position:relative;">${desktopTexts}</div>
             <div class="hero-visual-side-3d" id="desktop-visual-wrapper">${desktopVisuals}</div>
          </div>
        `;

        wrapper.innerHTML = `
          <div class="hero-mobile-only">${mobileHtml}</div>
          <div class="hero-desktop-only">${desktopHtml}</div>
        `;

        if (slides.length > 1) {
          dotsContainer.innerHTML = slides.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></div>`).join('');
          let currentSlide = 0;
          
          // Mobile Elements
          const mobileSlides = wrapper.querySelectorAll('.hero-mobile-only .hero-slide');
          
          // Desktop Elements
          const textCards = wrapper.querySelectorAll('.desktop-text-card');
          const visualCards = wrapper.querySelectorAll('.desktop-3d-card');
          const dotElements = dotsContainer.querySelectorAll('.dot');
          const total = slides.length;

          const update3DCarousel = (curr) => {
            visualCards.forEach((card, i) => {
              let offset = i - curr;
              if (offset > Math.floor(total / 2)) offset -= total;
              if (offset < -Math.floor(total / 2)) offset += total;
              
              if (offset === 0) {
                card.style.transform = 'translate(-50%, -50%) scale(1.05)';
                card.style.zIndex = 10;
                card.style.opacity = 1;
                card.style.filter = 'blur(0px) brightness(1)';
              } else if (offset === 1) {
                card.style.transform = 'translate(10%, -50%) scale(0.85)';
                card.style.zIndex = 5;
                card.style.opacity = 0.8;
                card.style.filter = 'blur(2px) brightness(0.7)';
              } else if (offset === -1 || (total === 2 && offset === 1)) {
                // If only 2 items, the other is treated as right side. 
                // But generally for left:
                card.style.transform = 'translate(-110%, -50%) scale(0.85)';
                card.style.zIndex = 5;
                card.style.opacity = 0.8;
                card.style.filter = 'blur(2px) brightness(0.7)';
              } else {
                card.style.transform = `translate(${offset > 0 ? '100%' : '-200%'}, -50%) scale(0.7)`;
                card.style.zIndex = 1;
                card.style.opacity = 0;
              }
            });
          };

          const goToSlide = (idx) => {
            // Mobile
            mobileSlides[currentSlide]?.classList.remove('active');
            dotElements[currentSlide]?.classList.remove('active');
            textCards[currentSlide]?.classList.remove('active');
            
            currentSlide = idx;
            
            mobileSlides[currentSlide]?.classList.add('active');
            dotElements[currentSlide]?.classList.add('active');
            textCards[currentSlide]?.classList.add('active');
            
            // Desktop 3D
            update3DCarousel(currentSlide);
          };

          // Init 3D
          update3DCarousel(0);

          dotElements.forEach(d => d.addEventListener('click', () => goToSlide(Number(d.dataset.idx))));
          setInterval(() => { goToSlide((currentSlide + 1) % slides.length); }, 4000);
        }
      } catch(e) {
        console.error("Hero load error:", e);
        wrapper.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#000000;background:#ffffff;">Failed to load</div>';
      }
    })();

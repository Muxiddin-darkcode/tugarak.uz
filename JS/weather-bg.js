// Ob-havo va Geolocation asosida dinamik 3D fon yaratish
function initWeatherBg() {
    // 1. Sahifaga tsParticles konteynerini qo'shish (agar yo'q bo'lsa)
    if (!document.getElementById('tsparticles')) {
        const particlesDiv = document.createElement('div');
        particlesDiv.id = 'tsparticles';
        // pointer-events-none muhim, aks holda tugmalar bosilmay qoladi
        particlesDiv.style.position = 'fixed';
        particlesDiv.style.top = '0';
        particlesDiv.style.left = '0';
        particlesDiv.style.width = '100vw';
        particlesDiv.style.height = '100vh';
        particlesDiv.style.pointerEvents = 'none';
        particlesDiv.style.zIndex = '9999';
        document.body.appendChild(particlesDiv);
    }

    // 2. Geolocation orqali joylashuvni aniqlash
    const defaultLat = 40.48; // Guliston
    const defaultLon = 68.78; // Guliston

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchWeatherAndApply(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                console.log("Geolocation rad etildi yoki xatolik. Standard hudud (Guliston) ishlatilmoqda.");
                fetchWeatherAndApply(defaultLat, defaultLon);
            }
        );
    } else {
        fetchWeatherAndApply(defaultLat, defaultLon);
    }

    // 3. Open-Meteo orqali havo holatini olish
    async function fetchWeatherAndApply(lat, lon) {
        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const data = await res.json();
            const weatherCode = data.current_weather.weathercode;
            const temp = data.current_weather.temperature;
            
            // Vidjetni yangilash (faqat index.html da mavjud bo'lsa)
            const widget = document.getElementById('weather-widget');
            if (widget) {
                let icon = '☀️';
                if (weatherCode === 2 || weatherCode === 3) icon = '☁️';
                else if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) icon = '🌧️';
                else if ((weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86)) icon = '❄️';
                else if (weatherCode >= 95 && weatherCode <= 99) icon = '⛈️';
                
                widget.innerHTML = `
                    <style>
                        @import url('https://fonts.cdnfonts.com/css/digital-7-mono');
                        .digital-clock {
                            font-family: 'Digital-7 Mono', monospace;
                            color: #e5e7eb; /* Asl oqish/kulrang rang */
                            text-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
                            letter-spacing: 2px;
                        }
                    </style>
                    <div class="flex flex-col items-end gap-1.5 bg-white/5 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-2xl shadow-xl transition-all hover:bg-white/10 hover:scale-105 cursor-default">
                        <div class="flex items-center gap-3 font-semibold text-white mb-1">
                            <span class="text-xl animate-bounce" style="animation-duration: 2s;">${icon}</span> 
                            <span id="weather-temp" class="text-lg tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">0°C</span>
                        </div>
                        <div class="w-full h-[1px] bg-white/10 mb-1"></div>
                        <div id="live-time" class="digital-clock text-4xl">--:--:--</div>
                        <div id="live-date" class="digital-clock text-sm opacity-80 mt-0.5">--.--.----</div>
                    </div>
                `;

                // Haroratni sanab chiqish (Count-up) animatsiyasi
                const tempEl = document.getElementById('weather-temp');
                let currentTemp = 0;
                const duration = 1500;
                const steps = 30;
                const stepTime = duration / steps;
                const inc = temp / steps;
                
                const tempInterval = setInterval(() => {
                    currentTemp += inc;
                    if ((inc > 0 && currentTemp >= temp) || (inc < 0 && currentTemp <= temp) || temp === 0) {
                        currentTemp = temp;
                        clearInterval(tempInterval);
                    }
                    tempEl.textContent = `${currentTemp > 0 ? '+' : ''}${Math.round(currentTemp)}°C`;
                }, stepTime);

                // Jonli vaqt va sanani yangilash
                function updateDateTime() {
                    const timeEl = document.getElementById('live-time');
                    const dateEl = document.getElementById('live-date');
                    if (timeEl && dateEl) {
                        const now = new Date();
                        const timeString = now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        const dateString = now.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        timeEl.textContent = timeString;
                        dateEl.textContent = dateString;
                    }
                }
                updateDateTime();
                setInterval(updateDateTime, 1000);
            }

            const month = new Date().getMonth(); // 0-11
            applyAnimation(weatherCode, month);
        } catch (error) {
            console.error("Ob-havoni olishda xatolik:", error);
            // Default xavfsiz animatsiya (Ochiq havo)
            applyAnimation(0, new Date().getMonth());
        }
    }

    // 4. Holatga qarab animatsiya turini tanlash va ishga tushirish
    function applyAnimation(code, month) {
        let condition = 'clear'; // default
        
        // WMO Weather Codes
        if (code === 0 || code === 1) condition = 'clear';
        else if (code === 2 || code === 3) condition = 'cloudy';
        else if (code >= 51 && code <= 67 || code >= 80 && code <= 82) condition = 'rain';
        else if (code >= 71 && code <= 77 || code >= 85 && code <= 86) condition = 'snow';
        else if (code >= 95 && code <= 99) condition = 'storm';

        // Faslni aniqlash
        let season = 'spring';
        if (month === 11 || month === 0 || month === 1) season = 'winter';
        else if (month >= 2 && month <= 4) season = 'spring';
        else if (month >= 5 && month <= 7) season = 'summer';
        else if (month >= 8 && month <= 10) season = 'autumn';

        console.log(`Joriy holat: ${condition}, Fasl: ${season}`);
        
        // Maxsus qishki qor faqat qishda yoki qor kodida
        if (season === 'winter' && condition === 'clear') condition = 'snow_light';
        if (season === 'autumn' && condition === 'clear') condition = 'autumn_leaves';

        loadParticlesBasedOnCondition(condition);
    }

    // 5. tsParticles konfiguratsiyalari
    async function loadParticlesBasedOnCondition(condition) {
        let options = getClearOptions(); // Default
        
        switch (condition) {
            case 'snow':
            case 'snow_light':
                options = getSnowOptions();
                break;
            case 'rain':
            case 'storm':
                options = getRainOptions();
                break;
            case 'cloudy':
                options = getCloudyOptions();
                break;
            case 'autumn_leaves':
                options = getAutumnOptions();
                break;
            case 'clear':
            default:
                options = getClearOptions();
                break;
        }

        // Kutubxona yuklanganini kutish
        if (typeof tsParticles !== 'undefined') {
            await tsParticles.load("tsparticles", options);
            const canvas = document.querySelector('#tsparticles canvas');
            if (canvas) canvas.style.pointerEvents = 'none';
        } else {
            console.error("tsParticles kutubxonasi topilmadi.");
        }
    }

    // ---- Mukammal 3D Configurations ----

    // Bahor (Ochiq havo) - Haqiqiy 🌸 (sakura) emojilari (Yengillashtirilgan)
    function getClearOptions() {
        return {
            fpsLimit: 60, // Smooth 60 FPS
            particles: {
                number: { value: 15, density: { enable: true, value_area: 800 } }, // Kamroq gul
                color: { value: "#ffffff" },
                shape: { 
                    type: ["char", "character"],
                    options: {
                        char: { value: "🌸", font: "Arial" },
                        character: { value: "🌸", font: "Arial" }
                    }
                },
                opacity: {
                    value: { min: 0.4, max: 0.8 },
                    random: true,
                },
                size: {
                    value: { min: 6, max: 12 }, // Gullar kichkinalashtirildi
                    random: true,
                },
                move: {
                    enable: true,
                    speed: 3, // Tezlashtirildi
                    direction: "bottom-right",
                    random: true,
                    straight: false,
                    outModes: { default: "out" },
                },
                rotate: {
                    value: 0,
                    random: true,
                    direction: "random",
                    animation: {
                        enable: false // Aylanib tushish o'chirildi (protsessorni tejaydi)
                    }
                }
            },
            retina_detect: false // Katta ekranlarda qo'shimcha resurs yemasligi uchun
        };
    }

    // Qor (Qish) - Haqiqiy qor parchalari
    function getSnowOptions() {
        return {
            fpsLimit: 60,
            particles: {
                number: { value: 30, density: { enable: true, value_area: 800 } },
                color: { value: "#ffffff" },
                shape: { 
                    type: ["char", "character"],
                    options: {
                        char: { value: "❄️", font: "Arial" },
                        character: { value: "❄️", font: "Arial" }
                    }
                },
                opacity: { value: { min: 0.4, max: 0.9 }, random: true },
                size: { value: { min: 8, max: 16 }, random: true },
                move: {
                    enable: true,
                    speed: 4, // Tezlashtirildi
                    direction: "bottom",
                    random: true,
                    straight: false,
                    outModes: { default: "out" },
                },
                rotate: {
                    value: 0,
                    random: true,
                    direction: "random",
                    animation: { enable: true, speed: 2, sync: false }
                }
            },
            retina_detect: false
        };
    }

    // Yomg'ir
    function getRainOptions() {
        return {
            fpsLimit: 60,
            particles: {
                number: { value: 200, density: { enable: true, value_area: 800 } },
                color: { value: "#8da5c7" },
                shape: { type: "line" },
                opacity: { value: 0.5, random: false },
                size: { value: 15, random: false, anim: { enable: false } },
                move: {
                    enable: true,
                    speed: 25,
                    direction: "bottom",
                    random: false,
                    straight: true,
                    out_mode: "out",
                    bounce: false,
                }
            },
            retina_detect: true
        };
    }

    // Bulutli / Tumanli - Haqiqiy bulutlar
    function getCloudyOptions() {
        return {
            fpsLimit: 60,
            particles: {
                number: { value: 12, density: { enable: true, value_area: 800 } },
                color: { value: "#ffffff" },
                shape: { 
                    type: ["char", "character"],
                    options: {
                        char: { value: "☁️", font: "Arial" },
                        character: { value: "☁️", font: "Arial" }
                    }
                },
                opacity: { value: { min: 0.3, max: 0.7 }, random: true },
                size: { value: { min: 30, max: 80 }, random: true }, // Katta bulutlar
                move: {
                    enable: true,
                    speed: 1.5, // Tezlashtirildi
                    direction: "right", // O'ngga qarab suzish
                    random: true,
                    straight: false,
                    outModes: { default: "out" },
                }
            },
            retina_detect: false
        };
    }

    // Kuzgi barglar
    function getAutumnOptions() {
        return {
            fpsLimit: 60,
            particles: {
                number: { value: 40, density: { enable: true, value_area: 800 } },
                color: { value: ["#ea580c", "#d97706", "#b45309", "#991b1b"] },
                shape: { type: "polygon", polygon: { nb_sides: 5 } },
                opacity: { value: 0.8, random: true },
                size: { value: 10, random: true },
                move: {
                    enable: true,
                    speed: 1.5,
                    direction: "bottom-left",
                    random: true,
                    straight: false,
                    out_mode: "out",
                    bounce: false,
                    rotate: { enable: true, speed: 5, random: true }
                }
            },
            retina_detect: true
        };
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWeatherBg);
} else {
    initWeatherBg();
}

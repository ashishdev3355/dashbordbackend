const pool = require('../client');

// Initial blog articles migrated directly from current public OBD Smart website
const INITIAL_BLOGS = [
  {
    "id": "post-1",
    "title": "Diagnosing ABS Faults on Royal Enfield BS6 Motorcycles: A Step-by-Step Workshop Guide",
    "slug": "diagnosing-abs-faults-royal-enfield-bs6",
    "category": "Vehicle Service / Repair Tips",
    "excerpt": "A persistent ABS warning light after a monsoon ride or wheel change is common on Royal Enfield 350/650 BS6 models. Learn how to verify wheel speed sensors, inspect the tone ring air gap, and read live ABS wheel speed telemetry.",
    "featured": true,
    "publishedDate": "Sep 05, 2026",
    "readingTime": "6 min read",
    "tags": [
      "Royal Enfield",
      "ABS Diagnostics",
      "BS6 Bikes",
      "Workshop Tips",
      "Wheel Speed Sensor"
    ],
    "author": {
      "name": "Vikram Rajput",
      "role": "Master Diagnostic Technician"
    },
    "content": "### Understanding the Royal Enfield Dual-Channel ABS Architecture\n\nThe BS6 emission and safety regulations made dual-channel Anti-lock Braking Systems (ABS) standard across mid-capacity motorcycles in India, including the Royal Enfield Classic 350, Hunter 350, Meteor 350, and 650 Twins. Unlike standard generic engine ECUs, the ABS Electronic Control Unit (ECU) operates on a dedicated communication sub-bus that monitors two critical inputs: front and rear active Hall-effect wheel speed sensors.\n\nWhen the ABS warning lamp stays illuminated at speeds exceeding 10 km/h, the ABS module has detected an electrical fault or a signal plausibility error.\n\n---\n\n### Key Diagnostic Steps in the Workshop\n\n#### 1. Visual Inspection of the Tone Ring (Phonic Wheel)\nBefore connecting any scan tool, always check the mechanical components:\n- **Debris & Mud Accumulation:** Monsoon riding frequently packs mud into the tone ring slots. Even a single clogged slot can distort the magnetic pulse train.\n- **Tone Ring Runout:** If the wheel was recently removed for puncture repair or tire replacement, mechanics sometimes warp the stamped metal tone ring. Total runout should not exceed 0.25 mm.\n- **Air Gap Clearance:** Using a brass or plastic non-magnetic feeler gauge, verify the sensor air gap is between **0.5 mm and 1.2 mm**.\n\n#### 2. Connecting the OBD Scanner to the Dedicated ABS Line\nGeneric OBD-II dongles fail to communicate with Royal Enfield ABS units because they only request standard Mode 03 engine emission codes on ISO 15765-4 CAN. \n\nUsing an **OBD Smart Pro scanner with the 6-pin Euro 5 / BS6 motorcycle diagnostic connector**:\n1. Turn the ignition ON, kill switch to RUN, but do not crank the starter.\n2. Select **Motorcycle Diagnostics → Royal Enfield → ABS Module**.\n3. Read stored Fault Codes (DTCs). Common codes include:\n   - **C0031:** Front Wheel Speed Sensor Electrical Circuit Fault\n   - **C0035:** Rear Wheel Speed Sensor Missing Pulse or Plausibility\n   - **C0040:** Sensor Supply Voltage Out of Range\n\n#### 3. Live Telemetry Spin Test\nPlace the motorcycle on its center stand (or paddock stand):\n- With the scanner in **Live Sensor Data** mode, manually rotate the front wheel by hand.\n- Verify that the front wheel speed displays between **3 to 8 km/h** proportionally to your rotation.\n- Repeat for the rear wheel in neutral gear.\n- If one sensor remains at **0.0 km/h** while the wheel spins, the fault is isolated to that sensor, its connector harness near the swingarm pivot, or the air gap.\n\n---\n\n### Pro Workshop Tip\nAfter repairing the wiring or replacing the sensor, always take the bike for a short test ride above 15 km/h. The ABS system requires a valid calibration drive cycle to complete its self-check routine before it turns off the dashboard indicator lamp and enables full hydraulic modulation."
  },
  {
    "id": "post-2",
    "title": "Top Causes of MAF Sensor Circuit Codes (P0101-P0104) and Proper Troubleshooting",
    "slug": "top-causes-maf-sensor-codes-p0101-p0104",
    "category": "Vehicle Service / Repair Tips",
    "excerpt": "Code P0101 is one of the most frequently misdiagnosed check engine light codes. Discover why replacing the sensor often fails to fix the issue, and how to verify intake vacuum integrity, power grounds, and fuel trims.",
    "featured": false,
    "publishedDate": "Aug 28, 2026",
    "readingTime": "5 min read",
    "tags": [
      "MAF Sensor",
      "P0101",
      "Engine Diagnostics",
      "Fuel Trims",
      "Sensors"
    ],
    "author": {
      "name": "Rohan Deshmukh",
      "role": "Automotive Systems Specialist"
    },
    "content": "### What DTC P0101 Really Means\n\n**P0101: Mass Air Flow (MAF) Sensor Circuit Range / Performance Problem.**\n\nThe engine ECU expects the MAF sensor signal (in grams per second or Hertz) to correlate directly with engine RPM, throttle position (TPS), and manifold absolute pressure (MAP). When the calculated air mass differs by more than 15-20% from the measured MAF reading under load, the ECU flags code P0101.\n\nReplacing the sensor right away without diagnosis is a rookie mistake that costs car owners thousands of rupees.\n\n---\n\n### The 4 Primary Root Causes\n\n#### 1. Oil & Dust Contamination on the Heated Hot Wire\nIn Indian dusty road conditions or vehicles with aftermarket oiled cotton air filters, micro-particles fuse onto the platinum hot wire sensing element. The layer of dirt acts as a thermal insulator, making the sensor report lower air volume than is actually entering the cylinders.\n- **Fix:** Spray clean with an approved, non-residue Mass Air Flow cleaner. Never touch the wire with a cotton swab or screwdriver tip.\n\n#### 2. Downstream Air Leaks (False Air)\nAny unmetered air entering between the MAF sensor housing and the throttle body will cause lean fuel trims:\n- Cracked accordion intake boots\n- Torn PCV breather hoses\n- Leaking brake booster vacuum check valves\n\n#### 3. Reference Voltage and Ground Drop\nCheck the MAF harness with a digital multimeter:\n- **Pin 1 (12V B+ Battery Feed):** Must show battery voltage with key ON.\n- **Pin 2 (Ground):** Maximum allowable voltage drop across the sensor ground to battery negative is **0.05V (50mV)**.\n- **Pin 3 (5V Reference):** Must be a stable 4.98V to 5.02V from the ECU.\n\n#### 4. Correlating With Short Term & Long Term Fuel Trims\nUse OBD Smart Live Data:\n- If Short Term Fuel Trim (STFT) is **+18%** at idle but normalizes to **+3%** at 2,500 RPM, you are dealing with a **vacuum leak**, not a faulty MAF sensor.\n- If fuel trims remain consistently lean or rich across all RPM ranges, inspect the MAF sensor scaling or fuel pressure."
  },
  {
    "id": "post-3",
    "title": "BS6 Phase 2 Real Driving Emissions (RDE) Norms: What Indian Workshops Need to Know",
    "slug": "bs6-phase-2-rde-norms-workshop-guide",
    "category": "Industry Review",
    "excerpt": "BS6 Phase 2 brought mandatory On-Board Diagnostics (OBD-II Stage 2) to all passenger vehicles and commercial fleets. Here is how continuous catalyst monitoring and secondary oxygen sensors alter diagnostic strategies.",
    "featured": true,
    "publishedDate": "Aug 18, 2026",
    "readingTime": "7 min read",
    "tags": [
      "BS6 Phase 2",
      "RDE Norms",
      "Emission Standards",
      "Automotive Industry",
      "OBD-II Stage 2"
    ],
    "author": {
      "name": "Aditya Swaminathan",
      "role": "Chief Automotive Regulatory Analyst"
    },
    "content": "### The Mandate Behind BS6 Phase 2 (RDE)\n\nIn April 2023, India transitioned to BS6 Phase 2 norms, incorporating **Real Driving Emissions (RDE)** monitoring alongside stricter on-board diagnostic mandates (often referred to as OBD-II Stage 2).\n\nUnder Phase 1, vehicle emissions were primarily tested in laboratory dynamometer conditions on predefined driving cycles. Phase 2 requires vehicles to continuously monitor emission-critical components in real-time under diverse real-world Indian road conditions, varying temperatures, and fluctuating fuel quality.\n\n---\n\n### What Changed in the Diagnostic Architecture?\n\n#### 1. Self-Diagnosing Catalytic Converters\nUnder Stage 2, the ECU constantly evaluates the oxygen storage capacity of the catalytic converter by comparing switching frequencies between the upstream Wideband Air-Fuel (A/F) sensor and the downstream heated oxygen sensor (O2S). A catalytic efficiency dropping below 92% immediately illuminates the Malfunction Indicator Lamp (MIL).\n\n#### 2. Canister Purge Valve & Evaporative Leak Detection\nThe Evaporative Emission Control (EVAP) system now incorporates a dedicated vapor pressure sensor that conducts automatic vacuum decay tests when the vehicle is parked. Even a loose fuel filler cap or a microscopic 0.5 mm pinhole leak in a vapor line will trigger DTC **P0442** or **P0455**.\n\n#### 3. Individual Cylinder Misfire Detection\nInstead of simply noticing overall engine vibration, Phase 2 engine management units monitor micro-second angular acceleration changes of the crankshaft between cylinder firing events. The scan tool now reports exact misfire counts per cylinder in Mode 06 on-board monitoring.\n\n---\n\n### Workshop Readiness Checklist\nIndependent garages and workshops must upgrade from generic code readers to professional OBD scanners that support:\n- Comprehensive Mode 06 hexadecimal diagnostic definitions\n- Secondary oxygen sensor heater circuit monitoring\n- I/M Readiness readiness monitors check before customer vehicle handover\n- Generation of detailed before-and-after PDF diagnostic reports in regional Indian languages"
  },
  {
    "id": "post-4",
    "title": "The Transition to Electronic Fuel Injection (EFI) in Indian Two-Wheelers: A Mechanic's Perspective",
    "slug": "transition-to-efi-indian-two-wheelers",
    "category": "Industry Review",
    "excerpt": "Carburetors are now automotive history. Explore how local garages and mechanics across India adapted to electronic fuel pumps, throttle position sensors, and closed-loop lambda control on commuter motorcycles.",
    "featured": false,
    "publishedDate": "Aug 04, 2026",
    "readingTime": "5 min read",
    "tags": [
      "EFI",
      "Motorcycle Tech",
      "Mechanic Insights",
      "BS6 Two Wheelers",
      "Workshop Evolution"
    ],
    "author": {
      "name": "Sunil Sharma",
      "role": "Automotive Workshop Consultant"
    },
    "content": "### The End of the Carburetor Era\n\nFor four decades, independent motorcycle mechanics in India relied on a flathead screwdriver and ear-tuning to balance idle RPM and air-fuel mixture screws on carburetors. With the rollout of BS6 emission norms, carburetors became obsolete almost overnight.\n\nFrom high-volume commuter bikes like the Hero Splendor, Honda Activa, and Bajaj Pulsar to sport bikes, every two-wheeler now relies on an Electronic Fuel Injection (EFI) system governed by an ECU, fuel pump, injector, and closed-loop oxygen sensor.\n\n---\n\n### Major Challenges Faced by Independent Garages\n\n#### 1. Intermittent Electrical Glitches vs Mechanical Problems\nWhen a commuter bike hesitated under throttle, mechanics traditionally cleaned the pilot jet or replaced the spark plug. With EFI, hesitation can be caused by:\n- A flat spot in the Throttle Position Sensor (TPS) resistive track\n- Weak fuel pump delivery pressure (falling below 2.5 bar under acceleration)\n- An Engine Oil Temperature (EOT) sensor stuck in warm mode during cold starts\n\n#### 2. The Language Barrier in Diagnostic Tools\nMany mechanics in Tier-2 and Tier-3 cities found imported English diagnostic scanners intimidating. Understanding English technical jargon like \"Short to B+\" or \"Circuit Low Input\" caused confusion.\n\nThe introduction of regional language diagnostic tools (supporting Hindi, Tamil, Telugu, Marathi, etc.) has empowered local garage owners to diagnose computerized bikes confidently and share transparent PDF reports with their customers on WhatsApp.\n\n---\n\n### The Future: Electric Vehicle (EV) Powertrains\nThe transition to EFI laid the technical foundation for motorcycle mechanics to understand digital sensors and CAN communication. This identical diagnostic mindset is now paving the way for two-wheeler mechanics to service BLDC motor controllers, BMS battery management systems, and electric scooters."
  },
  {
    "id": "post-5",
    "title": "OBD Smart Pro 11-Cable Kit Review: The Multi-Brand Motorcycle Scanner Tested in the Field",
    "slug": "obd-smart-pro-11-cable-kit-review",
    "category": "Product Reviews",
    "excerpt": "We spent three weeks running diagnostics with the OBD Smart Pro 11-Cable Kit across Royal Enfield, Bajaj, KTM, TVS, Yamaha, and Honda bikes. Here is our comprehensive performance, speed, and reliability review.",
    "featured": true,
    "publishedDate": "Jul 24, 2026",
    "readingTime": "6 min read",
    "tags": [
      "OBD Smart Pro",
      "Product Review",
      "Motorcycle Diagnostic",
      "Workshop Scanner",
      "Tool Test"
    ],
    "author": {
      "name": "Rohan K.",
      "role": "Lead Technician & Garage Owner"
    },
    "content": "### What Is in the Box?\n\nThe **OBD Smart Pro 11-Cable Kit** is specifically engineered for multi-brand Indian two-wheeler garages. Inside the rugged semi-rigid EVA storage case, you get:\n- 1x High-speed Bluetooth OBD-II Smart Diagnostic Interface\n- 11x Custom Molded Adapter Cables (covering Bajaj 6-pin, KTM 6-pin, TVS 6-pin, Royal Enfield Euro 5 6-pin, Honda 4-pin, Yamaha 3-pin & 4-pin, Suzuki 6-pin, and OBD standard 16-pin)\n- Lifetime Mobile App Activation Card (supporting unlimited vehicle scans)\n- Setup guide with complete pinout wiring diagrams\n\n---\n\n### Field Testing Results\n\n#### Test 1: 2023 KTM Duke 390 (ABS Warning & Throttle Limp Mode)\n- **Connection Time:** Paired with Android smartphone over Bluetooth in **4 seconds**.\n- **Result:** Scanner identified DTC **P2119** (Throttle Actuator Control Throttle Body Range) and **C0035** (Rear ABS speed sensor signal).\n- **Live Data:** Monitored dual TPS voltages while opening throttle smoothly. Clearly spotted a voltage dropout at 42% opening. After cleaning the connector and throttle plate, codes were cleared and the bike passed self-test.\n\n#### Test 2: Royal Enfield Interceptor 650 (Solid ABS Indicator)\n- Many entry-level OBD scanners fail to talk to Royal Enfield's Bosch ABS control module.\n- The OBD Smart Pro connected directly to the ABS ECU, identified the front wheel sensor fault code, and verified live wheel speed readings during rotation on the center stand.\n\n#### Test 3: Generating Multi-Lingual PDF Reports\nAt our Pune workshop, we ran a pre-delivery diagnostic check on a Yamaha R15 V4. We generated a customer PDF report in Marathi, complete with our workshop name, address, and cleared diagnostic timestamps. Sending the report directly to the client via WhatsApp resulted in immediate customer trust.\n\n---\n\n### Verdict\n- **Pros:** Fast Bluetooth 5.0 connection, zero yearly renewal fees, robust molded cable strain reliefs, full multi-lingual report generation, covers 98% of Indian motorcycles.\n- **Cons:** Requires a smartphone/tablet (no standalone screen).\n- **Final Rating:** **4.9 / 5.0** — An indispensable tool for modern independent motorcycle workshops."
  },
  {
    "id": "post-6",
    "title": "Bluetooth OBD2 Adapters vs Dedicated Handheld Scanners: Which is Right for Your Garage?",
    "slug": "bluetooth-obd2-adapters-vs-handheld-scanners",
    "category": "Product Reviews",
    "excerpt": "Should your automotive workshop invest in a wireless smartphone-based OBD adapter or a standalone handheld scanner with a built-in screen? Here is a breakdown of speed, cost, battery life, and software updates.",
    "featured": false,
    "publishedDate": "Jul 10, 2026",
    "readingTime": "5 min read",
    "tags": [
      "Scanner Comparison",
      "Hardware Review",
      "Garage Tools",
      "Bluetooth OBD",
      "Buyer Guide"
    ],
    "author": {
      "name": "Aditya Swaminathan",
      "role": "Chief Automotive Regulatory Analyst"
    },
    "content": "### The Great Diagnostic Tool Dilemma\n\nWhen outfitting a garage or upgrading from legacy equipment, mechanics often ask: *Should I buy a wireless Bluetooth adapter paired with an Android app, or a standalone handheld scanner with a built-in LCD screen?*\n\nBoth architectures have distinct strengths. Below is an objective field comparison across everyday workshop parameters.\n\n---\n\n### Direct Feature Comparison\n\n| Parameter | Wireless Bluetooth Smart Adapter | Standalone Handheld Tool |\n| :--- | :--- | :--- |\n| **Mobility & Range** | 10–15m wireless range around vehicle | Restricted by 1.5m OBD cable |\n| **Display Quality** | High-resolution smartphone / tablet OLED | Small 2.8\"–4.3\" low-res LCD screen |\n| **Software Updates** | Instant OTA updates via Google Play Store | Requires USB connection to Windows PC |\n| **Reporting** | 1-click WhatsApp PDF sharing with customer | Print via thermal paper or SD card transfer |\n| **Multi-Language** | Dynamic regional languages with voice support | Mostly English with basic translations |\n| **Subscription Cost** | Often one-time lifetime license | Expensive annual update renewals |\n| **Ruggedness** | Depends on mobile phone case | Built-in rubber shock bumpers |\n\n---\n\n### Which One Fits Your Needs?\n\n#### Choose a Bluetooth Smart Adapter if:\n- You run an active workshop and want to share professional branded inspection reports on WhatsApp directly with vehicle owners.\n- You need high-speed graphical telemetry graphs (plotting 4 PIDs simultaneously at 20+ Hz).\n- You want a lightweight setup that slips into your pocket when road-testing vehicles.\n\n#### Choose a Standalone Handheld Tool if:\n- You work in harsh outdoor conditions where employees frequently drop or misplace mobile devices.\n- You prefer a dedicated single-purpose device with no smartphone pairing steps."
  },
  {
    "id": "post-7",
    "title": "Understanding Diagnostic Trouble Codes (DTC): The Ultimate Guide to P, C, B, and U Codes",
    "slug": "understanding-diagnostic-trouble-codes-dtc-guide",
    "category": "OBD Related",
    "excerpt": "Ever wondered what makes P-codes different from C, B, or U codes? Learn the anatomy of standard 5-character SAE trouble codes, the difference between generic and manufacturer-specific codes, and how freeze frames assist troubleshooting.",
    "featured": true,
    "publishedDate": "Jun 25, 2026",
    "readingTime": "7 min read",
    "tags": [
      "DTC Codes",
      "OBD-II Fundamentals",
      "P-Codes",
      "Freeze Frame",
      "Trouble Codes"
    ],
    "author": {
      "name": "Vikram Rajput",
      "role": "Master Diagnostic Technician"
    },
    "content": "### Anatomy of a 5-Character Diagnostic Trouble Code\n\nEvery standard OBD-II trouble code consists of one letter followed by four alphanumeric characters. Each position carries a standardized diagnostic meaning defined by the Society of Automotive Engineers (SAE J2012):\n\n```\n[ P ]  [ 0 ]  [ 1 ]  [ 0 ]  [ 1 ]\n  │      │      │      └────── Specific Fault Index (01 = MAF Circuit Range)\n  │      │      └───────────── Subsystem Category (1 = Fuel & Air Metering)\n  │      └──────────────────── Code Type (0 = Generic SAE, 1 = Manufacturer Specific)\n  └─────────────────────────── Vehicle System (P = Powertrain)\n```\n\n---\n\n### The 4 Major System Categories\n\n#### 1. P - Powertrain Codes\nCovers engine, transmission, emissions, and hybrid/EV propulsion systems:\n- **P0100 - P0199:** Fuel and Air Metering (MAF, MAP, O2 sensors, throttle)\n- **P0200 - P0299:** Fuel Injector Circuit faults\n- **P0300 - P0399:** Ignition System & Misfire Detection\n- **P0400 - P0499:** Auxiliary Emission Controls (EGR, EVAP, Catalytic Converter)\n- **P0700 - P0999:** Automatic Transmission, Torque Converter & Gearbox\n\n#### 2. C - Chassis Codes\nCovers mechanical vehicle control outside the engine bay:\n- Anti-lock Braking System (ABS)\n- Electronic Stability Program (ESP / ESC)\n- Traction Control System (TCS)\n- Steering Angle Sensors & Suspension Damping\n\n#### 3. B - Body Codes\nCovers internal cabin comfort, safety, and security:\n- Airbag deployment & SRS squib circuits\n- Climate control and AC compressor clutches\n- Central locking, immobilizer, and power window modules\n\n#### 4. U - Network & Communication Codes\nCovers data bus integrity between ECUs:\n- **U0100:** Lost Communication with Engine Control Module\n- **U0121:** Lost Communication with ABS Control Module\n- CAN High / CAN Low bus short circuits or termination resistor failures\n\n---\n\n### The Power of Freeze Frame Data\nWhen an emissions fault triggers the MIL, the ECU takes a digital snapshot of engine operating conditions at the exact moment the code logged:\n- Engine RPM\n- Vehicle Speed\n- Engine Coolant Temperature\n- Short Term & Long Term Fuel Trims\n- Throttle Position\n\nReviewing the Freeze Frame with an OBD scanner allows technicians to recreate the exact driving conditions (e.g., cruising at 80 km/h under light throttle) to verify whether the repair was successful."
  },
  {
    "id": "post-8",
    "title": "How to Use Live Sensor Telemetry (Mode 01) to Catch Intermittent Engine Misfires Early",
    "slug": "how-to-use-live-sensor-telemetry-mode-01",
    "category": "OBD Related",
    "excerpt": "Intermittent misfires that do not trigger a solid check engine light can baffle technicians. Learn how to log real-time oxygen sensor voltages, fuel trims, and ignition timing data to pinpoint weak coils and clogged injectors.",
    "featured": false,
    "publishedDate": "Jun 12, 2026",
    "readingTime": "6 min read",
    "tags": [
      "Live Telemetry",
      "Engine Misfires",
      "Mode 01",
      "OBD-II Logging",
      "Fuel Trim Analysis"
    ],
    "author": {
      "name": "Rohan Deshmukh",
      "role": "Automotive Systems Specialist"
    },
    "content": "### The Frustration of Intermittent Hesitation\n\nFew problems are more challenging for workshop mechanics than a customer complaining that their car or bike *\"stumbles for a split second when accelerating uphill,\"* yet the dashboard check engine light never turns on, and scanning for codes shows zero stored DTCs.\n\nThis occurs because standard OBD-II misfire algorithms require a misfire rate of roughly **2% to 3%** over a continuous 200 or 1000 crankshaft revolution window before setting a pending or confirmed code.\n\nHere is how professional technicians use **Mode 01 Live Sensor Telemetry** to identify the failure before the computer turns on the light.\n\n---\n\n### 3 Key Parameters to Graph Simultaneously\n\n#### 1. Upstream Oxygen Sensor Voltage (O2S B1S1)\nIn closed-loop operation, a standard zirconium O2 sensor should rapidly oscillate between **0.1V (lean)** and **0.9V (rich)** approximately 1 to 2 times every second.\n- If you notice the voltage dipping to **0.05V** and staying flat during acceleration while engine speed hesitates, unburnt oxygen from a misfiring cylinder is entering the exhaust manifold.\n\n#### 2. Short Term Fuel Trim (STFT)\nWhen a cylinder misfires due to a weak ignition spark, the unburned air inside the cylinder enters the exhaust pipe. The oxygen sensor detects this extra oxygen and mistakenly believes the mixture is lean, causing STFT to spike upwards (+15% to +25%) in a vain attempt to add fuel.\n\n#### 3. Spark Ignition Advance (Timing)\nWatch for sudden erratic timing retards. If the ECU knock sensor picks up combustion knock caused by pre-ignition, it will retard timing by 8 to 12 degrees, causing an instant loss of torque.\n\n---\n\n### Diagnostic Step-by-Step Procedure\n1. Mount your smartphone on the dashboard running the OBD Smart app.\n2. Select **Live Sensor Graphing** and choose:\n   - Engine RPM\n   - Throttle Position (%)\n   - O2 Sensor Voltage\n   - STFT (%)\n3. Conduct a safe road test in 3rd gear, accelerating from 2,000 RPM at 60% throttle.\n4. Export the logged CSV/graph data. Look for the exact timestamp where RPM plateaued; the corresponding fuel trim and voltage spike will confirm whether the cause is ignition breakdown or fuel starvation."
  }
];

async function initBlogTables() {
  try {
    // 1. Create blogs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blogs (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        slug VARCHAR(500) UNIQUE NOT NULL,
        category VARCHAR(100) NOT NULL,
        excerpt TEXT,
        content TEXT,
        featured BOOLEAN DEFAULT false,
        published BOOLEAN DEFAULT true,
        published_date VARCHAR(100),
        reading_time VARCHAR(50),
        featured_image TEXT DEFAULT '',
        tags JSONB DEFAULT '[]'::jsonb,
        author_name VARCHAR(255) DEFAULT 'OBD Smart Team',
        author_role VARCHAR(255) DEFAULT 'Technical Editor',
        author_avatar VARCHAR(500) DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Ensure all columns exist (combined in a single transaction/block for performance)
    try {
      await pool.query(`
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS title VARCHAR(500);
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS slug VARCHAR(500);
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS category VARCHAR(100);
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS excerpt TEXT;
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS content TEXT;
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT true;
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS published_date VARCHAR(100);
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS reading_time VARCHAR(50);
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS featured_image TEXT DEFAULT '';
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS author_name VARCHAR(255) DEFAULT 'OBD Smart Team';
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS author_role VARCHAR(255) DEFAULT 'Technical Editor';
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS author_avatar VARCHAR(500) DEFAULT '';
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE blogs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      `);
    } catch (colErr) {
      // Ignore if columns already exist
    }

    // 3. Create blog audit logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_audit_logs (
        id SERIAL PRIMARY KEY,
        blog_id VARCHAR(100) NOT NULL,
        action VARCHAR(50) NOT NULL,
        changed_by VARCHAR(255),
        changes JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Seed initial blog articles if table is empty
    const checkRes = await pool.query('SELECT COUNT(*) as count FROM blogs WHERE title IS NOT NULL');
    if (parseInt(checkRes.rows[0].count, 10) === 0) {
      console.log('Migrating initial public blog articles into PostgreSQL database...');
      for (let i = 0; i < INITIAL_BLOGS.length; i++) {
        const blog = INITIAL_BLOGS[i];
        await pool.query(
          `INSERT INTO blogs (
            id, title, slug, category, excerpt, content,
            featured, published, published_date, reading_time,
            featured_image, tags, author_name, author_role, author_avatar,
            sort_order, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            slug = EXCLUDED.slug,
            category = EXCLUDED.category,
            excerpt = EXCLUDED.excerpt,
            content = EXCLUDED.content,
            featured = EXCLUDED.featured,
            published = EXCLUDED.published,
            published_date = EXCLUDED.published_date,
            reading_time = EXCLUDED.reading_time,
            featured_image = EXCLUDED.featured_image,
            tags = EXCLUDED.tags,
            author_name = EXCLUDED.author_name,
            author_role = EXCLUDED.author_role,
            author_avatar = EXCLUDED.author_avatar,
            sort_order = EXCLUDED.sort_order,
            updated_at = CURRENT_TIMESTAMP`,
          [
            blog.id,
            blog.title,
            blog.slug,
            blog.category,
            blog.excerpt || '',
            blog.content || '',
            Boolean(blog.featured),
            true, // published on current website
            blog.publishedDate || '',
            blog.readingTime || '',
            blog.featuredImage || '',
            JSON.stringify(blog.tags || []),
            blog.author?.name || 'OBD Smart Team',
            blog.author?.role || 'Technical Editor',
            blog.author?.avatar || '',
            i + 1
          ]
        );
      }
      console.log('Initial blog articles migration completed successfully.');
    }
  } catch (error) {
    console.error('Error initializing blog tables:', error);
  }
}

module.exports = {
  initBlogTables,
  INITIAL_BLOGS
};

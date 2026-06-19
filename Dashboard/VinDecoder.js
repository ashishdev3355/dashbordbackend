const {
  Country_dict,
  region_dict,
  model_year_mapping,
  Manufacturer_mapping,
  model_line_mapping_hyundai,
  plant_mapping_hyundai,
  model_name_mapping_mahindra,
  plant_mapping_mahindra,
  model_name_mapping_audi,
  plant_name_mapping_audi,
  model_name_mapping_volkswagen,
  plant_name_mapping_volkswagen,
  model_name_mapping_NorthAm_mercedes,
  plant_name_mapping_NorthAm_mercedes,
  model_name_mapping_EurInd_mercedes,
  plant_name_mapping_EurInd_mercedes,
  model_var_bodyType,
  plant_name_jaguar,
  model_name_pre2000,
  model_name_mapping_toyota,
  model_name_mapping_toyota_Europe,
  plant_name_mapping_toyota,
  plant_name_BMW,
  model_name_mapping_BMW,
  plant_mapping_skoda,
  model_name_mapping_tata,
  plant_mapping_tata,
  model_name_mapping_jeep,
  plant_mapping_jeep,
  model_name_mapping_marutiSuzuki,
  plant_mapping_marutiSuzuki,
  plant_name_mapping_fordEurope,
  model_line_mapping_fordEurope,
  plant_name_mapping_fordUsa,
  ford_usa_modelName_fordUsa,
  ford_usa_modelName_forUsa1,
  ford_usa_modelName_forUsa2,
  model_line_mapping_fordIndia
} = require("./vinMappings");

const VinDecoder = async (req, res) => {
  try {
    const { vin } = req.query;

    if (!vin) {
      return res.status(400).json({
        message: "vin parameter is required",
      });
    }

    const cleanVin = vin.trim().toUpperCase();

    if (cleanVin.length !== 17) {
      return res.status(400).json({
        message: "VIN must be exactly 17 characters long",
      });
    }

    if (/[IOQ]/.test(cleanVin)) {
      return res.status(400).json({
        message: "VIN contains invalid characters: I, O, and Q are not allowed",
      });
    }

    const manufacturer = cleanVin.substring(0, 3);
    const country_code = cleanVin.substring(0, 2);
    const region_id_char = cleanVin[0];

    const country_name = Country_dict[country_code] || "Unknown";
    const region_id = region_dict[region_id_char] || "Unknown";
    const manufacturer_name = Manufacturer_mapping[manufacturer] || manufacturer;

    let decoded = {
      manufacturer: manufacturer_name,
      country: country_name,
      region: region_id,
      model: "Unknown",
      year: "Unknown",
      plant: "Unknown"
    };

    // Hyundai
    const manufact_list_hyundai = [
      'AC5','KMC','KME','KMF','KMH','KMJ','KMT','KMU','KMX',
      'KMZ','KM8','KND','KPH','LBE','MAL','MB2','MF3','NLH','NLJ','PFD','TMA','TMC','U5Y','X7M','XWE','Z94',
      '2HM','3KP','5NM','5NP','5NT','5XY','8LG','95P','9BH'
    ];

    // Audi
    const manufact_list_audi = ['TRU','WAU','WA1','WUA','93U','93V'];

    // Volkswagen
    const manufact_list_volkswagen = [
      'AAV','LFV','LSV','MEX','VWV','WVG','WVW','WV1','WV2','WV3','XW8','YBW','1VW','2V4','2V8','3VW','8AW','9BW'
    ];

    // Mercedes
    const manufact_list_mercedes = ['MBR','NLE','NMB','VSA','WDB','WDD','WDF','WEB','WMX','4JG','9BM'];

    // Jaguar
    const manufact_list_jaguar = ['L2C','SAJ','99J'];

    // Toyota
    const manufact_list_toyota = [
      "AHT", "JT", "LTV", "MBJ", "MHF", "MR0", "NMT", "SB1", "TW1", "VNK", "2T", "4T", "5T", "6T1",
      "8AJ", "93R", "9BR", "1NK", "1NX", "1T1", "1TE", "2T1", "2T3", "3RZ", "3TM", "4T1", "4T2",
      "4T3", "4T4", "4TA", "4X2", "4X3", "4X4", "4X6", "4X7", "4X8", "5TB", "5TD", "5TE", "5TF",
      "5X0", "5X3"
    ];

    // BMW
    const manufact_list_BMW = ['WBA','WBS','WBW','WBY','X4X','4US','WB1'];

    // Mahindra
    const manufact_list_mahindra = ['MA1','MAB','MAC'];

    // Skoda
    const manufact_list_skoda = ['MEX','TMB','TMP','TM9','Y6U'];

    // TATA
    const manufact_list_tata = ['ADX','KLT','KLU','MAT'];

    // Jeep
    const manufact_list_jeep = [
      'ZAC','1JC','1JT','1J4','1J7','1J8','1UT','2BC','2J4','988','1C4','1C6','1C7','2C4','2C6','2C7','3C4','3C6','3C7'
    ];

    // Maruti Suzuki
    const manufact_list_maruti = ['MA3','MBH'];

    // Ford
    const manufact_list_ford = [
      'AFA','AFB','JC0','JC2','KNJ','LVS','MAJ','MNA','MNB','MNC','MPB','NM0','PE1','PE3','LFA','RHA',
      'RL0','SBC','SFA','SKF','SLP','TW2','UN1','VSK','VS6','WF0','XLC','X9F','Y4F','Z6F','1FA','1FB','1FC','1FD','1FM','1FT','1F1','1F6','1ZV',
      '2FA','2FM','2FT','3FA','3FC','3FE','3FM','3FN','3FR','3FT','5LD','6FP','7A5','8AF','9BF'
    ];

    if (manufact_list_hyundai.includes(manufacturer)) {
      const model_line = cleanVin[3];
      const model_year = cleanVin[9];
      const plant_name = cleanVin[10];

      decoded.model = model_line_mapping_hyundai[model_line] || model_line;
      decoded.year = model_year_mapping[model_year] || model_year;
      decoded.plant = plant_mapping_hyundai[plant_name] || plant_name;
    } 
    else if (manufact_list_audi.includes(manufacturer)) {
      const model_year = cleanVin[9];
      const model_name = cleanVin.substring(6, 8);
      const plant_name = cleanVin[10];

      decoded.model = model_name_mapping_audi[model_name] || model_name;
      decoded.year = model_year_mapping[model_year] || model_year;
      decoded.plant = plant_name_mapping_audi[plant_name] || plant_name;
    } 
    else if (manufact_list_volkswagen.includes(manufacturer)) {
      const model_year = cleanVin[9];
      const model_name = cleanVin.substring(6, 8);
      const plant_name = cleanVin[10];

      decoded.model = model_name_mapping_volkswagen[model_name] || model_name;
      decoded.year = model_year_mapping[model_year] || model_year;
      decoded.plant = plant_name_mapping_volkswagen[plant_name] || plant_name;
    } 
    else if (manufact_list_mercedes.includes(manufacturer)) {
      if (['Europe', 'Asia'].includes(region_id)) {
        const model_name = cleanVin.substring(3, 6);
        const plant_name = cleanVin[10];

        decoded.model = model_name_mapping_EurInd_mercedes[model_name] || model_name;
        decoded.plant = plant_name_mapping_EurInd_mercedes[plant_name] || plant_name;
      } else {
        const model_year = cleanVin[9];
        const model_name = cleanVin.substring(0, 4);
        const plant_name = cleanVin[10];

        decoded.model = model_name_mapping_NorthAm_mercedes[model_name] || model_name;
        decoded.year = model_year_mapping[model_year] || model_year;
        decoded.plant = plant_name_mapping_NorthAm_mercedes[plant_name] || plant_name;
      }
    } 
    else if (manufact_list_jaguar.includes(manufacturer)) {
      const model_year_code = cleanVin[9];
      const model_year = model_year_mapping[model_year_code];
      decoded.year = model_year || model_year_code;

      const yearNum = parseInt(model_year);
      if (!isNaN(yearNum) && yearNum >= 2000) {
        const model_name = cleanVin.substring(5, 7);
        decoded.model = model_var_bodyType[model_name] || model_name;
      } else {
        const model_name = cleanVin[3];
        decoded.model = model_name_pre2000[model_name] || model_name;
      }
      const plant_name = cleanVin[10];
      decoded.plant = plant_name_jaguar[plant_name] || plant_name;
    } 
    else if (manufact_list_toyota.includes(manufacturer)) {
      let model_name = cleanVin[7];
      const model_year = cleanVin[9];
      const plant_name = cleanVin[10];

      if (region_id === 'North America') {
        decoded.model = model_name_mapping_toyota[model_name] || model_name;
      } else {
        decoded.model = model_name_mapping_toyota_Europe[model_name] || model_name;
      }
      decoded.year = model_year_mapping[model_year] || model_year;
      decoded.plant = plant_name_mapping_toyota[plant_name] || plant_name;
    } 
    else if (manufact_list_BMW.includes(manufacturer)) {
      const model_name = cleanVin.substring(3, 6);
      const model_year = cleanVin[9];
      const plant_name = cleanVin[10];

      decoded.model = model_name_mapping_BMW[model_name] || model_name;
      decoded.year = model_year_mapping[model_year] || model_year;
      decoded.plant = plant_name_BMW[plant_name] || plant_name;
    } 
    else if (manufact_list_mahindra.includes(manufacturer)) {
      const model_name = cleanVin.substring(3, 5);
      const model_year = cleanVin[9];
      const plant_name = cleanVin[10];

      decoded.model = model_name_mapping_mahindra[model_name] || model_name;
      decoded.year = model_year_mapping[model_year] || model_year;
      decoded.plant = plant_mapping_mahindra[plant_name] || plant_name;
    } 
    else if (manufact_list_skoda.includes(manufacturer)) {
      const model_year = cleanVin[9];
      const plant_name = cleanVin[10];

      decoded.year = model_year_mapping[model_year] || model_year;
      decoded.plant = plant_mapping_skoda[plant_name] || plant_name;
    } 
    else if (manufact_list_tata.includes(manufacturer)) {
      const model_name = cleanVin.substring(3, 7);
      const model_year = cleanVin[9];
      const plant_name = cleanVin[10];

      decoded.model = model_name_mapping_tata[model_name] || model_name;
      decoded.year = model_year_mapping[model_year] || model_year;
      decoded.plant = plant_mapping_tata[plant_name] || plant_name;
    } 
    else if (manufact_list_jeep.includes(manufacturer)) {
      const plant_name = cleanVin[10];
      const model_name = cleanVin.substring(4, 6);
      const model_year = cleanVin[9];

      decoded.model = model_name_mapping_jeep[model_name] || model_name;
      decoded.year = model_year_mapping[model_year] || model_year;
      decoded.plant = plant_mapping_jeep[plant_name] || plant_name;
    } 
    else if (manufact_list_maruti.includes(manufacturer)) {
      const model_name = cleanVin.substring(4, 7);
      const model_year = cleanVin[9];
      const plant_name = cleanVin.substring(7, 9);

      decoded.model = model_name_mapping_marutiSuzuki[model_name] || model_name;
      decoded.year = model_year_mapping[model_year] || model_year;
      decoded.plant = plant_mapping_marutiSuzuki[plant_name] || plant_name;
    } 
    else if (manufact_list_ford.includes(manufacturer)) {
      if (region_id === "Europe") {
        const model_line = cleanVin[8];
        const plant_name = cleanVin[7];
        const model_year = cleanVin[10];

        decoded.model = model_line_mapping_fordEurope[model_line] || model_line;
        decoded.year = model_year_mapping[model_year] || model_year;
        decoded.plant = plant_name_mapping_fordEurope[plant_name] || plant_name;
      } 
      else if (['North America', 'South America'].includes(region_id)) {
        const plant_name = cleanVin[10];
        const model_year = cleanVin[9];

        const model_name = cleanVin.substring(4, 7);
        const model_name2 = cleanVin.substring(4, 6);
        const model_name1 = cleanVin[4];
        let model_Name_val = null;

        if (ford_usa_modelName_fordUsa[model_name] !== undefined) {
          model_Name_val = ford_usa_modelName_fordUsa[model_name];
        } else if (ford_usa_modelName_forUsa2[model_name2] !== undefined) {
          model_Name_val = ford_usa_modelName_forUsa2[model_name2];
        } else {
          model_Name_val = ford_usa_modelName_forUsa1[model_name1] || null;
        }

        decoded.model = model_Name_val || "Unknown";
        decoded.year = model_year_mapping[model_year] || model_year;
        decoded.plant = plant_name_mapping_fordUsa[plant_name] || plant_name;
      } 
      else if (region_id === 'Asia') {
        const model_year = cleanVin[10];
        const model_line = cleanVin[8];

        decoded.model = model_line_mapping_fordIndia[model_line] || model_line;
        decoded.year = model_year_mapping[model_year] || model_year;
      }
    } else {
      // For any unsupported manufacturer, try to decode at least the year
      const model_year = cleanVin[9];
      decoded.year = model_year_mapping[model_year] || "Unknown";
    }

    return res.status(200).json({
      data: decoded
    });

  } catch (error) {
    console.error("Error decoding VIN:", error);
    return res.status(500).json({
      code: 500,
      message: "Something went wrong during VIN decoding",
    });
  }
};

module.exports = VinDecoder;

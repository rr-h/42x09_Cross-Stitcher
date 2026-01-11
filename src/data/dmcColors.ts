// DMC Embroidery Thread Color Database
// Total colours: 489

export interface DMCColor {
  code: string;
  name: string;
  hex: string;
  rgb: [number, number, number];
  symbol: string;
}

// Complete DMC colour palette: 489 colours
export const DMC_COLORS: DMCColor[] = [
  { code: '3713', name: 'Salmon Very Light', hex: '#FFE2E2', rgb: [255, 226, 226], symbol: '0' },
  { code: '761', name: 'Salmon Light', hex: '#FFC9C9', rgb: [255, 201, 201], symbol: '1' },
  { code: '760', name: 'Salmon', hex: '#F5ADAD', rgb: [245, 173, 173], symbol: '2' },
  { code: '3712', name: 'Salmon Medium', hex: '#F18787', rgb: [241, 135, 135], symbol: '3' },
  { code: '3328', name: 'Salmon Dark', hex: '#E36D6D', rgb: [227, 109, 109], symbol: '4' },
  { code: '347', name: 'Salmon Very Dark', hex: '#BF2D2D', rgb: [191, 45, 45], symbol: '5' },
  { code: '353', name: 'Peach', hex: '#FED7CC', rgb: [254, 215, 204], symbol: '6' },
  { code: '352', name: 'Coral Light', hex: '#FD9C97', rgb: [253, 156, 151], symbol: '7' },
  { code: '351', name: 'Coral', hex: '#E96A67', rgb: [233, 106, 103], symbol: '8' },
  { code: '350', name: 'Coral Medium', hex: '#E04848', rgb: [224, 72, 72], symbol: '9' },
  { code: '349', name: 'Coral Dark', hex: '#D21035', rgb: [210, 16, 53], symbol: 'A' },
  { code: '817', name: 'Coral Red Very Dark', hex: '#BB051F', rgb: [187, 5, 31], symbol: 'B' },
  { code: '3708', name: 'Melon Light', hex: '#FFCBD5', rgb: [255, 203, 213], symbol: 'C' },
  { code: '3706', name: 'Melon Medium', hex: '#FFADBC', rgb: [255, 173, 188], symbol: 'D' },
  { code: '3705', name: 'Melon Dark', hex: '#FF7992', rgb: [255, 121, 146], symbol: 'E' },
  { code: '3801', name: 'Melon Very Dark', hex: '#E74967', rgb: [231, 73, 103], symbol: 'F' },
  { code: '666', name: 'Bright Red', hex: '#E31D42', rgb: [227, 29, 66], symbol: 'G' },
  { code: '321', name: 'Red', hex: '#C72B3B', rgb: [199, 43, 59], symbol: 'H' },
  { code: '304', name: 'Red Medium', hex: '#B71F33', rgb: [183, 31, 51], symbol: 'I' },
  { code: '498', name: 'Red Dark', hex: '#A7132B', rgb: [167, 19, 43], symbol: 'J' },
  { code: '816', name: 'Garnet', hex: '#970B23', rgb: [151, 11, 35], symbol: 'K' },
  { code: '815', name: 'Garnet Medium', hex: '#87071F', rgb: [135, 7, 31], symbol: 'L' },
  { code: '814', name: 'Garnet Dark', hex: '#7B001B', rgb: [123, 0, 27], symbol: 'M' },
  { code: '894', name: 'Carnation Very Light', hex: '#FFB2BB', rgb: [255, 178, 187], symbol: 'N' },
  { code: '893', name: 'Carnation Light', hex: '#FC90A2', rgb: [252, 144, 162], symbol: 'O' },
  { code: '892', name: 'Carnation Medium', hex: '#FF798C', rgb: [255, 121, 140], symbol: 'P' },
  { code: '891', name: 'Carnation Dark', hex: '#FF5773', rgb: [255, 87, 115], symbol: 'Q' },
  { code: '818', name: 'Baby Pink', hex: '#FFDFD9', rgb: [255, 223, 217], symbol: 'R' },
  { code: '957', name: 'Geranium Pale', hex: '#FDB5B5', rgb: [253, 181, 181], symbol: 'S' },
  { code: '956', name: 'Geranium', hex: '#FF9191', rgb: [255, 145, 145], symbol: 'T' },
  { code: '309', name: 'Rose Dark', hex: '#D62B5B', rgb: [214, 43, 91], symbol: 'U' },
  {
    code: '963',
    name: 'Dusty Rose Ultra Very Light',
    hex: '#FFD7D7',
    rgb: [255, 215, 215],
    symbol: 'V',
  },
  {
    code: '3716',
    name: 'Dusty Rose Medium Very Light',
    hex: '#FFBDBD',
    rgb: [255, 189, 189],
    symbol: 'W',
  },
  { code: '962', name: 'Dusty Rose Medium', hex: '#E68A8A', rgb: [230, 138, 138], symbol: 'X' },
  { code: '961', name: 'Dusty Rose Dark', hex: '#CF7373', rgb: [207, 115, 115], symbol: 'Y' },
  { code: '3833', name: 'Raspberry Light', hex: '#EA8699', rgb: [234, 134, 153], symbol: 'Z' },
  { code: '3832', name: 'Raspberry Medium', hex: '#DB556E', rgb: [219, 85, 110], symbol: 'a' },
  { code: '3831', name: 'Raspberry Dark', hex: '#B32F48', rgb: [179, 47, 72], symbol: 'b' },
  { code: '777', name: 'Raspberry Very Dark', hex: '#913546', rgb: [145, 53, 70], symbol: 'c' },
  { code: '819', name: 'Baby Pink Light', hex: '#FFEEEB', rgb: [255, 238, 235], symbol: 'd' },
  { code: '3326', name: 'Rose Light', hex: '#FBADB4', rgb: [251, 173, 180], symbol: 'e' },
  { code: '776', name: 'Pink Medium', hex: '#FCB0B9', rgb: [252, 176, 185], symbol: 'f' },
  { code: '899', name: 'Rose Medium', hex: '#F27688', rgb: [242, 118, 136], symbol: 'g' },
  { code: '335', name: 'Rose', hex: '#EE546E', rgb: [238, 84, 110], symbol: 'h' },
  { code: '326', name: 'Rose Very Dark', hex: '#B33B4B', rgb: [179, 59, 75], symbol: 'i' },
  { code: '151', name: 'Dusty Rose Very Light', hex: '#F0CED4', rgb: [240, 206, 212], symbol: 'j' },
  { code: '3354', name: 'Dusty Rose Light', hex: '#E4A6AC', rgb: [228, 166, 172], symbol: 'k' },
  { code: '3733', name: 'Dusty Rose', hex: '#E8879B', rgb: [232, 135, 155], symbol: 'l' },
  { code: '3731', name: 'Dusty Rose Very Dark', hex: '#DA6783', rgb: [218, 103, 131], symbol: 'm' },
  { code: '3350', name: 'Dusty Rose Ultra Dark', hex: '#BC4365', rgb: [188, 67, 101], symbol: 'n' },
  {
    code: '150',
    name: 'Dusty Rose Ultra Very Dark',
    hex: '#AB0249',
    rgb: [171, 2, 73],
    symbol: 'o',
  },
  { code: '3689', name: 'Mauve Light', hex: '#FBBFC2', rgb: [251, 191, 194], symbol: 'p' },
  { code: '3688', name: 'Mauve Medium', hex: '#E7A9AC', rgb: [231, 169, 172], symbol: 'q' },
  { code: '3687', name: 'Mauve', hex: '#C96B70', rgb: [201, 107, 112], symbol: 'r' },
  { code: '3803', name: 'Mauve Dark', hex: '#AB3357', rgb: [171, 51, 87], symbol: 's' },
  { code: '3685', name: 'Mauve Very Dark', hex: '#881531', rgb: [136, 21, 49], symbol: 't' },
  { code: '605', name: 'Cranberry Very Light', hex: '#FFC0CD', rgb: [255, 192, 205], symbol: 'u' },
  { code: '604', name: 'Cranberry Light', hex: '#FFB0BE', rgb: [255, 176, 190], symbol: 'v' },
  { code: '603', name: 'Cranberry', hex: '#FFA4BE', rgb: [255, 164, 190], symbol: 'w' },
  { code: '602', name: 'Cranberry Medium', hex: '#E24874', rgb: [226, 72, 116], symbol: 'x' },
  { code: '601', name: 'Cranberry Dark', hex: '#D1286A', rgb: [209, 40, 106], symbol: 'y' },
  { code: '600', name: 'Cranberry Very Dark', hex: '#CD2F63', rgb: [205, 47, 99], symbol: 'z' },
  { code: '3806', name: 'Cyclamen Pink Light', hex: '#FF8CAE', rgb: [255, 140, 174], symbol: '!' },
  { code: '3805', name: 'Cyclamen Pink', hex: '#F3478B', rgb: [243, 71, 139], symbol: '#' },
  { code: '3804', name: 'Cyclamen Pink Dark', hex: '#E02876', rgb: [224, 40, 118], symbol: '$' },
  { code: '3609', name: 'Plum Ultra Light', hex: '#F4AED5', rgb: [244, 174, 213], symbol: '%' },
  { code: '3608', name: 'Plum Very Light', hex: '#EA9CC4', rgb: [234, 156, 196], symbol: '&' },
  { code: '3607', name: 'Plum Light', hex: '#C54989', rgb: [197, 73, 137], symbol: '(' },
  { code: '718', name: 'Plum', hex: '#9C2462', rgb: [156, 36, 98], symbol: ')' },
  { code: '917', name: 'Plum Medium', hex: '#9B1359', rgb: [155, 19, 89], symbol: '*' },
  { code: '915', name: 'Plum Dark', hex: '#820043', rgb: [130, 0, 67], symbol: ',' },
  {
    code: '225',
    name: 'Shell Pink Ultra Very Light',
    hex: '#FFDFD5',
    rgb: [255, 223, 213],
    symbol: '.',
  },
  { code: '224', name: 'Shell Pink Very Light', hex: '#EBB7AF', rgb: [235, 183, 175], symbol: '/' },
  {
    code: '152',
    name: 'Shell Pink Medium Light',
    hex: '#E2A099',
    rgb: [226, 160, 153],
    symbol: ':',
  },
  { code: '223', name: 'Shell Pink Light', hex: '#CC847C', rgb: [204, 132, 124], symbol: ';' },
  { code: '3722', name: 'Shell Pink Medium', hex: '#BC6C64', rgb: [188, 108, 100], symbol: '<' },
  { code: '3721', name: 'Shell Pink Dark', hex: '#A14B51', rgb: [161, 75, 81], symbol: '>' },
  { code: '221', name: 'Shell Pink Very Dark', hex: '#883E43', rgb: [136, 62, 67], symbol: '?' },
  {
    code: '778',
    name: 'Antique Mauve Very Light',
    hex: '#DFB3BB',
    rgb: [223, 179, 187],
    symbol: '@',
  },
  { code: '3727', name: 'Antique Mauve Light', hex: '#DBA9B2', rgb: [219, 169, 178], symbol: '[' },
  { code: '316', name: 'Antique Mauve Medium', hex: '#B7737F', rgb: [183, 115, 127], symbol: ']' },
  { code: '3726', name: 'Antique Mauve Dark', hex: '#9B5B66', rgb: [155, 91, 102], symbol: '^' },
  {
    code: '315',
    name: 'Antique Mauve Medium Dark',
    hex: '#814952',
    rgb: [129, 73, 82],
    symbol: '_',
  },
  {
    code: '3802',
    name: 'Antique Mauve Very Dark',
    hex: '#714149',
    rgb: [113, 65, 73],
    symbol: '`',
  },
  { code: '902', name: 'Garnet Very Dark', hex: '#822637', rgb: [130, 38, 55], symbol: '{' },
  {
    code: '3743',
    name: 'Antique Violet Very Light',
    hex: '#D7CBD3',
    rgb: [215, 203, 211],
    symbol: '|',
  },
  { code: '3042', name: 'Antique Violet Light', hex: '#B79DA7', rgb: [183, 157, 167], symbol: '}' },
  {
    code: '3041',
    name: 'Antique Violet Medium',
    hex: '#956F7C',
    rgb: [149, 111, 124],
    symbol: '~',
  },
  { code: '3740', name: 'Antique Violet Dark', hex: '#785762', rgb: [120, 87, 98], symbol: '¡' },
  { code: '3836', name: 'Grape Light', hex: '#BA91AA', rgb: [186, 145, 170], symbol: '¢' },
  { code: '3835', name: 'Grape Medium', hex: '#946083', rgb: [148, 96, 131], symbol: '£' },
  { code: '3834', name: 'Grape Dark', hex: '#72375D', rgb: [114, 55, 93], symbol: '¤' },
  { code: '154', name: 'Grape Very Dark', hex: '#572433', rgb: [87, 36, 51], symbol: '¥' },
  { code: '211', name: 'Lavender Light', hex: '#E3CBE3', rgb: [227, 203, 227], symbol: '¦' },
  { code: '210', name: 'Lavender Medium', hex: '#C39FC3', rgb: [195, 159, 195], symbol: '§' },
  { code: '209', name: 'Lavender Dark', hex: '#A37BA7', rgb: [163, 123, 167], symbol: '¨' },
  { code: '208', name: 'Lavender Very Dark', hex: '#835B8B', rgb: [131, 91, 139], symbol: '©' },
  { code: '3837', name: 'Lavender Ultra Dark', hex: '#6C3A6E', rgb: [108, 58, 110], symbol: 'ª' },
  { code: '327', name: 'Violet Dark', hex: '#633666', rgb: [99, 54, 102], symbol: '«' },
  { code: '153', name: 'Violet Very Light', hex: '#E6CCD9', rgb: [230, 204, 217], symbol: '¬' },
  { code: '554', name: 'Violet Light', hex: '#DBB3CB', rgb: [219, 179, 203], symbol: '®' },
  { code: '553', name: 'Violet', hex: '#A3638B', rgb: [163, 99, 139], symbol: '¯' },
  { code: '552', name: 'Violet Medium', hex: '#803A6B', rgb: [128, 58, 107], symbol: '°' },
  { code: '550', name: 'Violet Very Dark', hex: '#5C184E', rgb: [92, 24, 78], symbol: '±' },
  {
    code: '3747',
    name: 'Blue Violet Very Light',
    hex: '#D3D7ED',
    rgb: [211, 215, 237],
    symbol: '²',
  },
  { code: '341', name: 'Blue Violet Light', hex: '#B7BFDD', rgb: [183, 191, 221], symbol: '³' },
  {
    code: '156',
    name: 'Blue Violet Medium Light',
    hex: '#A3AED1',
    rgb: [163, 174, 209],
    symbol: '´',
  },
  { code: '340', name: 'Blue Violet Medium', hex: '#ADA7C7', rgb: [173, 167, 199], symbol: 'µ' },
  {
    code: '155',
    name: 'Blue Violet Medium Dark',
    hex: '#9891B6',
    rgb: [152, 145, 182],
    symbol: '¶',
  },
  { code: '3746', name: 'Blue Violet Dark', hex: '#776B98', rgb: [119, 107, 152], symbol: '·' },
  { code: '333', name: 'Blue Violet Very Dark', hex: '#5C5478', rgb: [92, 84, 120], symbol: '¸' },
  {
    code: '157',
    name: 'Cornflower Blue Very Light',
    hex: '#BBC3D9',
    rgb: [187, 195, 217],
    symbol: '¹',
  },
  { code: '794', name: 'Cornflower Blue Light', hex: '#8F9CC1', rgb: [143, 156, 193], symbol: 'º' },
  {
    code: '793',
    name: 'Cornflower Blue Medium',
    hex: '#707DA2',
    rgb: [112, 125, 162],
    symbol: '»',
  },
  { code: '3807', name: 'Cornflower Blue', hex: '#60678C', rgb: [96, 103, 140], symbol: '¼' },
  { code: '792', name: 'Cornflower Blue Dark', hex: '#555B7B', rgb: [85, 91, 123], symbol: '½' },
  {
    code: '158',
    name: 'Cornflower Blue Medium Very Dark',
    hex: '#4C526E',
    rgb: [76, 82, 110],
    symbol: '¾',
  },
  {
    code: '791',
    name: 'Cornflower Blue Very Dark',
    hex: '#464563',
    rgb: [70, 69, 99],
    symbol: '¿',
  },
  { code: '3840', name: 'Lavender Blue Light', hex: '#B0C0DA', rgb: [176, 192, 218], symbol: 'À' },
  { code: '3839', name: 'Lavender Blue Medium', hex: '#7B8EAB', rgb: [123, 142, 171], symbol: 'Á' },
  { code: '3838', name: 'Lavender Blue Dark', hex: '#5C7294', rgb: [92, 114, 148], symbol: 'Â' },
  { code: '800', name: 'Delft Blue Pale', hex: '#C0CCDE', rgb: [192, 204, 222], symbol: 'Ã' },
  { code: '809', name: 'Delft Blue', hex: '#94A8C6', rgb: [148, 168, 198], symbol: 'Ä' },
  { code: '799', name: 'Delft Blue Medium', hex: '#748EB6', rgb: [116, 142, 182], symbol: 'Å' },
  { code: '798', name: 'Delft Blue Dark', hex: '#466A8E', rgb: [70, 106, 142], symbol: 'Æ' },
  { code: '797', name: 'Royal Blue', hex: '#13477D', rgb: [19, 71, 125], symbol: 'Ç' },
  { code: '796', name: 'Royal Blue Dark', hex: '#11416D', rgb: [17, 65, 109], symbol: 'È' },
  { code: '820', name: 'Royal Blue Very Dark', hex: '#0E365C', rgb: [14, 54, 92], symbol: 'É' },
  { code: '162', name: 'Blue Ultra Very Light', hex: '#DBECF5', rgb: [219, 236, 245], symbol: 'Ê' },
  { code: '827', name: 'Blue Very Light', hex: '#BDDDED', rgb: [189, 221, 237], symbol: 'Ë' },
  { code: '813', name: 'Blue Light', hex: '#A1C2D7', rgb: [161, 194, 215], symbol: 'Ì' },
  { code: '826', name: 'Blue Medium', hex: '#6B9EBF', rgb: [107, 158, 191], symbol: 'Í' },
  { code: '825', name: 'Blue Dark', hex: '#4781A5', rgb: [71, 129, 165], symbol: 'Î' },
  { code: '824', name: 'Blue Very Dark', hex: '#396987', rgb: [57, 105, 135], symbol: 'Ï' },
  { code: '996', name: 'Electric Blue Medium', hex: '#30C2EC', rgb: [48, 194, 236], symbol: 'Ð' },
  { code: '3843', name: 'Electric Blue', hex: '#14AAD0', rgb: [20, 170, 208], symbol: 'Ñ' },
  { code: '995', name: 'Electric Blue Dark', hex: '#2696B6', rgb: [38, 150, 182], symbol: 'Ò' },
  { code: '3846', name: 'Turquoise Bright Light', hex: '#06E3E6', rgb: [6, 227, 230], symbol: 'Ó' },
  {
    code: '3845',
    name: 'Turquoise Bright Medium',
    hex: '#04C4CA',
    rgb: [4, 196, 202],
    symbol: 'Ô',
  },
  { code: '3844', name: 'Turquoise Bright Dark', hex: '#12AEBA', rgb: [18, 174, 186], symbol: 'Õ' },
  { code: '159', name: 'Blue Gray Light', hex: '#C7CAD7', rgb: [199, 202, 215], symbol: 'Ö' },
  { code: '160', name: 'Blue Gray Medium', hex: '#999FB7', rgb: [153, 159, 183], symbol: '×' },
  { code: '161', name: 'Blue Gray', hex: '#7880A4', rgb: [120, 128, 164], symbol: 'Ø' },
  {
    code: '3756',
    name: 'Baby Blue Ultra Very Light',
    hex: '#EEFCFC',
    rgb: [238, 252, 252],
    symbol: 'Ù',
  },
  { code: '775', name: 'Baby Blue Very Light', hex: '#D9EBF1', rgb: [217, 235, 241], symbol: 'Ú' },
  { code: '3841', name: 'Baby Blue Pale', hex: '#CDDFED', rgb: [205, 223, 237], symbol: 'Û' },
  { code: '3325', name: 'Baby Blue Light', hex: '#B8D2E6', rgb: [184, 210, 230], symbol: 'Ü' },
  { code: '3755', name: 'Baby Blue', hex: '#93B4CE', rgb: [147, 180, 206], symbol: 'Ý' },
  { code: '334', name: 'Baby Blue Medium', hex: '#739FC1', rgb: [115, 159, 193], symbol: 'Þ' },
  { code: '322', name: 'Baby Blue Dark', hex: '#5A8FB8', rgb: [90, 143, 184], symbol: 'ß' },
  { code: '312', name: 'Baby Blue Very Dark', hex: '#35668B', rgb: [53, 102, 139], symbol: 'à' },
  {
    code: '803',
    name: 'Baby Blue Ultra Very Dark',
    hex: '#2C597C',
    rgb: [44, 89, 124],
    symbol: 'á',
  },
  { code: '336', name: 'Navy Blue', hex: '#253B73', rgb: [37, 59, 115], symbol: 'â' },
  { code: '823', name: 'Navy Blue Dark', hex: '#213063', rgb: [33, 48, 99], symbol: 'ã' },
  { code: '939', name: 'Navy Blue Very Dark', hex: '#1B2853', rgb: [27, 40, 83], symbol: 'ä' },
  {
    code: '3753',
    name: 'Antique Blue Ultra Very Light',
    hex: '#DBE2E9',
    rgb: [219, 226, 233],
    symbol: 'å',
  },
  {
    code: '3752',
    name: 'Antique Blue Very Light',
    hex: '#C7D1DB',
    rgb: [199, 209, 219],
    symbol: 'æ',
  },
  { code: '932', name: 'Antique Blue Light', hex: '#A2B5C6', rgb: [162, 181, 198], symbol: 'ç' },
  { code: '931', name: 'Antique Blue Medium', hex: '#6A859E', rgb: [106, 133, 158], symbol: 'è' },
  { code: '930', name: 'Antique Blue Dark', hex: '#455C71', rgb: [69, 92, 113], symbol: 'é' },
  { code: '3750', name: 'Antique Blue Very Dark', hex: '#384C5E', rgb: [56, 76, 94], symbol: 'ê' },
  { code: '828', name: 'Sky Blue Very Light', hex: '#C5E8ED', rgb: [197, 232, 237], symbol: 'ë' },
  { code: '3761', name: 'Sky Blue Light', hex: '#ACD8E2', rgb: [172, 216, 226], symbol: 'ì' },
  { code: '519', name: 'Sky Blue', hex: '#7EB1C8', rgb: [126, 177, 200], symbol: 'í' },
  { code: '518', name: 'Wedgewood Light', hex: '#4F93A7', rgb: [79, 147, 167], symbol: 'î' },
  { code: '3760', name: 'Wedgewood Medium', hex: '#3E85A2', rgb: [62, 133, 162], symbol: 'ï' },
  { code: '517', name: 'Wedgewood Dark', hex: '#3B768F', rgb: [59, 118, 143], symbol: 'ð' },
  { code: '3842', name: 'Wedgewood Very Dark', hex: '#32667C', rgb: [50, 102, 124], symbol: 'ñ' },
  {
    code: '311',
    name: 'Wedgewood Ultra Very Dark',
    hex: '#1C5066',
    rgb: [28, 80, 102],
    symbol: 'ò',
  },
  {
    code: '747',
    name: 'Peacock Blue Very Light',
    hex: '#E5FCFD',
    rgb: [229, 252, 253],
    symbol: 'ó',
  },
  { code: '3766', name: 'Peacock Blue Light', hex: '#99CFD9', rgb: [153, 207, 217], symbol: 'ô' },
  { code: '807', name: 'Peacock Blue', hex: '#64ABBA', rgb: [100, 171, 186], symbol: 'õ' },
  { code: '806', name: 'Peacock Blue Dark', hex: '#3D95A5', rgb: [61, 149, 165], symbol: 'ö' },
  {
    code: '3765',
    name: 'Peacock Blue Very Dark',
    hex: '#347F8C',
    rgb: [52, 127, 140],
    symbol: '÷',
  },
  { code: '3811', name: 'Turquoise Very Light', hex: '#BCE3E6', rgb: [188, 227, 230], symbol: 'ø' },
  { code: '598', name: 'Turquoise Light', hex: '#90C3CC', rgb: [144, 195, 204], symbol: 'ù' },
  { code: '597', name: 'Turquoise', hex: '#5BA3B3', rgb: [91, 163, 179], symbol: 'ú' },
  { code: '3810', name: 'Turquoise Dark', hex: '#488E9A', rgb: [72, 142, 154], symbol: 'û' },
  { code: '3809', name: 'Turquoise Very Dark', hex: '#3F7C85', rgb: [63, 124, 133], symbol: 'ü' },
  {
    code: '3808',
    name: 'Turquoise Ultra Very Dark',
    hex: '#366970',
    rgb: [54, 105, 112],
    symbol: 'ý',
  },
  { code: '928', name: 'Gray Green Very Light', hex: '#DDE3E3', rgb: [221, 227, 227], symbol: 'þ' },
  { code: '927', name: 'Gray Green Light', hex: '#BDCBCB', rgb: [189, 203, 203], symbol: 'ÿ' },
  { code: '926', name: 'Gray Green Medium', hex: '#98AEAE', rgb: [152, 174, 174], symbol: 'Ā' },
  { code: '3768', name: 'Gray Green Dark', hex: '#657F7F', rgb: [101, 127, 127], symbol: 'ā' },
  { code: '924', name: 'Gray Green Very Dark', hex: '#566A6A', rgb: [86, 106, 106], symbol: 'Ă' },
  { code: '3849', name: 'Teal Green Light', hex: '#52B3A4', rgb: [82, 179, 164], symbol: 'ă' },
  { code: '3848', name: 'Teal Green Medium', hex: '#559392', rgb: [85, 147, 146], symbol: 'Ą' },
  { code: '3847', name: 'Teal Green Dark', hex: '#347D75', rgb: [52, 125, 117], symbol: 'ą' },
  { code: '964', name: 'Sea Green Light', hex: '#A9E2D8', rgb: [169, 226, 216], symbol: 'Ć' },
  { code: '959', name: 'Sea Green Medium', hex: '#59C7B4', rgb: [89, 199, 180], symbol: 'ć' },
  { code: '958', name: 'Sea Green Dark', hex: '#3EB6A1', rgb: [62, 182, 161], symbol: 'Ĉ' },
  { code: '3812', name: 'Sea Green Very Dark', hex: '#2F8C84', rgb: [47, 140, 132], symbol: 'ĉ' },
  { code: '3851', name: 'Green Bright Light', hex: '#49B3A1', rgb: [73, 179, 161], symbol: 'Ċ' },
  { code: '943', name: 'Green Bright Medium', hex: '#3D9384', rgb: [61, 147, 132], symbol: 'ċ' },
  { code: '3850', name: 'Green Bright Dark', hex: '#378477', rgb: [55, 132, 119], symbol: 'Č' },
  { code: '993', name: 'Aquamarine Very Light', hex: '#90C0B4', rgb: [144, 192, 180], symbol: 'č' },
  { code: '992', name: 'Aquamarine Light', hex: '#6FAE9F', rgb: [111, 174, 159], symbol: 'Ď' },
  { code: '3814', name: 'Aquamarine', hex: '#508B7D', rgb: [80, 139, 124], symbol: 'ď' },
  { code: '991', name: 'Aquamarine Dark', hex: '#477B6E', rgb: [71, 123, 110], symbol: 'Đ' },
  { code: '966', name: 'Jade Ultra Very Light', hex: '#B9D7C0', rgb: [185, 215, 192], symbol: 'đ' },
  { code: '564', name: 'Jade Very Light', hex: '#A7CDAF', rgb: [167, 205, 175], symbol: 'Ē' },
  { code: '563', name: 'Jade Light', hex: '#8FC098', rgb: [143, 192, 152], symbol: 'ē' },
  { code: '562', name: 'Jade Medium', hex: '#53976A', rgb: [83, 151, 106], symbol: 'Ĕ' },
  { code: '505', name: 'Jade Green', hex: '#338362', rgb: [51, 131, 98], symbol: 'ĕ' },
  { code: '3817', name: 'Celadon Green Light', hex: '#99C3AA', rgb: [153, 195, 170], symbol: 'Ė' },
  { code: '3816', name: 'Celadon Green', hex: '#65A57D', rgb: [101, 165, 125], symbol: 'ė' },
  { code: '163', name: 'Celadon Green Medium', hex: '#4D8361', rgb: [77, 131, 97], symbol: 'Ę' },
  { code: '3815', name: 'Celadon Green Dark', hex: '#477759', rgb: [71, 119, 89], symbol: 'ę' },
  { code: '561', name: 'Celadon Green Very Dark', hex: '#2C6A45', rgb: [44, 106, 69], symbol: 'Ě' },
  { code: '504', name: 'Blue Green Very Light', hex: '#C4DECC', rgb: [196, 222, 204], symbol: 'ě' },
  { code: '3813', name: 'Blue Green Light', hex: '#B2D4BD', rgb: [178, 212, 189], symbol: 'Ĝ' },
  { code: '503', name: 'Blue Green Medium', hex: '#7BAC94', rgb: [123, 172, 148], symbol: 'ĝ' },
  { code: '502', name: 'Blue Green', hex: '#5B9071', rgb: [91, 144, 113], symbol: 'Ğ' },
  { code: '501', name: 'Blue Green Dark', hex: '#396F52', rgb: [57, 111, 82], symbol: 'ğ' },
  { code: '500', name: 'Blue Green Very Dark', hex: '#044D33', rgb: [4, 77, 51], symbol: 'Ġ' },
  { code: '955', name: 'Nile Green Light', hex: '#A2D6AD', rgb: [162, 214, 173], symbol: 'ġ' },
  { code: '954', name: 'Nile Green', hex: '#88BA91', rgb: [136, 186, 145], symbol: 'Ģ' },
  { code: '913', name: 'Nile Green Medium', hex: '#6DAB77', rgb: [109, 171, 119], symbol: 'ģ' },
  { code: '912', name: 'Emerald Green Light', hex: '#1B9D6B', rgb: [27, 157, 107], symbol: 'Ĥ' },
  { code: '911', name: 'Emerald Green Medium', hex: '#189065', rgb: [24, 144, 101], symbol: 'ĥ' },
  { code: '910', name: 'Emerald Green Dark', hex: '#187E56', rgb: [24, 126, 86], symbol: 'Ħ' },
  { code: '909', name: 'Emerald Green Very Dark', hex: '#156F49', rgb: [21, 111, 73], symbol: 'ħ' },
  {
    code: '3818',
    name: 'Emerald Green Ultra Very Dark',
    hex: '#115A3B',
    rgb: [17, 90, 59],
    symbol: 'Ĩ',
  },
  {
    code: '369',
    name: 'Pistachio Green Very Light',
    hex: '#D7EDCC',
    rgb: [215, 237, 204],
    symbol: 'ĩ',
  },
  { code: '368', name: 'Pistachio Green Light', hex: '#A6C298', rgb: [166, 194, 152], symbol: 'Ī' },
  { code: '320', name: 'Pistachio Green Medium', hex: '#69885A', rgb: [105, 136, 90], symbol: 'ī' },
  { code: '367', name: 'Pistachio Green Dark', hex: '#617A52', rgb: [97, 122, 82], symbol: 'Ĭ' },
  {
    code: '319',
    name: 'Pistachio Green Very Dark',
    hex: '#205F2E',
    rgb: [32, 95, 46],
    symbol: 'ĭ',
  },
  {
    code: '890',
    name: 'Pistachio Green Ultra Very Dark',
    hex: '#174923',
    rgb: [23, 73, 35],
    symbol: 'Į',
  },
  { code: '164', name: 'Forest Green Light', hex: '#C8D8B8', rgb: [200, 216, 184], symbol: 'į' },
  { code: '989', name: 'Forest Green', hex: '#8DA675', rgb: [141, 166, 117], symbol: 'İ' },
  { code: '988', name: 'Forest Green Medium', hex: '#738B5B', rgb: [115, 139, 91], symbol: 'ı' },
  { code: '987', name: 'Forest Green Dark', hex: '#587141', rgb: [88, 113, 65], symbol: 'Ĳ' },
  { code: '986', name: 'Forest Green Very Dark', hex: '#405230', rgb: [64, 82, 48], symbol: 'ĳ' },
  {
    code: '772',
    name: 'Yellow Green Very Light',
    hex: '#E4ECD4',
    rgb: [228, 236, 212],
    symbol: 'Ĵ',
  },
  { code: '3348', name: 'Yellow Green Light', hex: '#CCD9B1', rgb: [204, 217, 177], symbol: 'ĵ' },
  { code: '3347', name: 'Yellow Green Medium', hex: '#71935C', rgb: [113, 147, 92], symbol: 'Ķ' },
  { code: '3346', name: 'Hunter Green', hex: '#406A3A', rgb: [64, 106, 58], symbol: 'ķ' },
  { code: '3345', name: 'Hunter Green Dark', hex: '#1B5915', rgb: [27, 89, 21], symbol: 'ĸ' },
  { code: '895', name: 'Hunter Green Very Dark', hex: '#1B5300', rgb: [27, 83, 0], symbol: 'Ĺ' },
  { code: '704', name: 'Chartreuse Bright', hex: '#9ECF34', rgb: [158, 207, 52], symbol: 'ĺ' },
  { code: '703', name: 'Chartreuse', hex: '#7BB547', rgb: [123, 181, 71], symbol: 'Ļ' },
  { code: '702', name: 'Kelly Green', hex: '#47A72F', rgb: [71, 167, 47], symbol: 'ļ' },
  { code: '701', name: 'Green Light', hex: '#3F8F29', rgb: [63, 143, 41], symbol: 'Ľ' },
  { code: '700', name: 'Green Bright', hex: '#07731B', rgb: [7, 115, 27], symbol: 'ľ' },
  { code: '699', name: 'Green', hex: '#056517', rgb: [5, 101, 23], symbol: 'Ŀ' },
  { code: '907', name: 'Parrot Green Light', hex: '#C7E666', rgb: [199, 230, 102], symbol: 'ŀ' },
  { code: '906', name: 'Parrot Green Medium', hex: '#7FB335', rgb: [127, 179, 53], symbol: 'Ł' },
  { code: '905', name: 'Parrot Green Dark', hex: '#628A28', rgb: [98, 138, 40], symbol: 'ł' },
  { code: '904', name: 'Parrot Green Very Dark', hex: '#557822', rgb: [85, 120, 34], symbol: 'Ń' },
  {
    code: '472',
    name: 'Avocado Green Ultra Light',
    hex: '#D8E498',
    rgb: [216, 228, 152],
    symbol: 'ń',
  },
  {
    code: '471',
    name: 'Avocado Green Very Light',
    hex: '#AEBF79',
    rgb: [174, 191, 121],
    symbol: 'Ņ',
  },
  { code: '470', name: 'Avocado Green Light', hex: '#94AB4F', rgb: [148, 171, 79], symbol: 'ņ' },
  { code: '469', name: 'Avocado Green', hex: '#72843C', rgb: [114, 132, 60], symbol: 'Ň' },
  { code: '937', name: 'Avocado Green Medium', hex: '#627133', rgb: [98, 113, 51], symbol: 'ň' },
  { code: '936', name: 'Avocado Green Very Dark', hex: '#4C5826', rgb: [76, 88, 38], symbol: 'ŉ' },
  { code: '935', name: 'Avocado Green Dark', hex: '#424D21', rgb: [66, 77, 33], symbol: 'Ŋ' },
  { code: '934', name: 'Avocado Green Black', hex: '#313919', rgb: [49, 57, 25], symbol: 'ŋ' },
  { code: '523', name: 'Fern Green Light', hex: '#ABB197', rgb: [171, 177, 151], symbol: 'Ō' },
  { code: '3053', name: 'Green Gray', hex: '#9CA482', rgb: [156, 164, 130], symbol: 'ō' },
  { code: '3052', name: 'Green Gray Medium', hex: '#889268', rgb: [136, 146, 104], symbol: 'Ŏ' },
  { code: '3051', name: 'Green Gray Dark', hex: '#5F6648', rgb: [95, 102, 72], symbol: 'ŏ' },
  { code: '524', name: 'Fern Green Very Light', hex: '#C4CDAC', rgb: [196, 205, 172], symbol: 'Ő' },
  { code: '522', name: 'Fern Green', hex: '#969E7E', rgb: [150, 158, 126], symbol: 'ő' },
  { code: '520', name: 'Fern Green Dark', hex: '#666D4F', rgb: [102, 109, 79], symbol: 'Œ' },
  { code: '3364', name: 'Pine Green', hex: '#83975F', rgb: [131, 151, 95], symbol: 'œ' },
  { code: '3363', name: 'Pine Green Medium', hex: '#728256', rgb: [114, 130, 86], symbol: 'Ŕ' },
  { code: '3362', name: 'Pine Green Dark', hex: '#5E6B47', rgb: [94, 107, 71], symbol: 'ŕ' },
  { code: '165', name: 'Moss Green Very Light', hex: '#EFF4A4', rgb: [239, 244, 164], symbol: 'Ŗ' },
  { code: '3819', name: 'Moss Green Light', hex: '#E0E868', rgb: [224, 232, 104], symbol: 'ŗ' },
  {
    code: '166',
    name: 'Moss Green Medium Light',
    hex: '#C0C840',
    rgb: [192, 200, 64],
    symbol: 'Ř',
  },
  { code: '581', name: 'Moss Green', hex: '#A7AE38', rgb: [167, 174, 56], symbol: 'ř' },
  { code: '580', name: 'Moss Green Dark', hex: '#888D33', rgb: [136, 141, 51], symbol: 'Ś' },
  { code: '734', name: 'Olive Green Light', hex: '#C7C077', rgb: [199, 192, 119], symbol: 'ś' },
  { code: '733', name: 'Olive Green Medium', hex: '#BCB34C', rgb: [188, 179, 76], symbol: 'Ŝ' },
  { code: '732', name: 'Olive Green', hex: '#948C36', rgb: [148, 140, 54], symbol: 'ŝ' },
  { code: '731', name: 'Olive Green Dark', hex: '#938B37', rgb: [147, 139, 55], symbol: 'Ş' },
  { code: '730', name: 'Olive Green Very Dark', hex: '#827B30', rgb: [130, 123, 48], symbol: 'ş' },
  { code: '3013', name: 'Khaki Green Light', hex: '#B9B982', rgb: [185, 185, 130], symbol: 'Š' },
  { code: '3012', name: 'Khaki Green Medium', hex: '#A6A75D', rgb: [166, 167, 93], symbol: 'š' },
  { code: '3011', name: 'Khaki Green Dark', hex: '#898A58', rgb: [137, 138, 88], symbol: 'Ţ' },
  { code: '372', name: 'Mustard Light', hex: '#CCB784', rgb: [204, 183, 132], symbol: 'ţ' },
  { code: '371', name: 'Mustard', hex: '#BFA671', rgb: [191, 166, 113], symbol: 'Ť' },
  { code: '370', name: 'Mustard Medium', hex: '#B89D64', rgb: [184, 157, 100], symbol: 'ť' },
  {
    code: '834',
    name: 'Golden Olive Very Light',
    hex: '#DBBE7F',
    rgb: [219, 190, 127],
    symbol: 'Ŧ',
  },
  { code: '833', name: 'Golden Olive Light', hex: '#C8AB6C', rgb: [200, 171, 108], symbol: 'ŧ' },
  { code: '832', name: 'Golden Olive', hex: '#BD9B51', rgb: [189, 155, 81], symbol: 'Ũ' },
  { code: '831', name: 'Golden Olive Medium', hex: '#AA8F56', rgb: [170, 143, 86], symbol: 'ũ' },
  { code: '830', name: 'Golden Olive Dark', hex: '#8D784B', rgb: [141, 120, 75], symbol: 'Ū' },
  { code: '829', name: 'Golden Olive Very Dark', hex: '#7E6B42', rgb: [126, 107, 66], symbol: 'ū' },
  { code: '613', name: 'Drab Brown Very Light', hex: '#DCC4AA', rgb: [220, 196, 170], symbol: 'Ŭ' },
  { code: '612', name: 'Drab Brown Light', hex: '#BC9A78', rgb: [188, 154, 120], symbol: 'ŭ' },
  { code: '611', name: 'Drab Brown', hex: '#967656', rgb: [150, 118, 86], symbol: 'Ů' },
  { code: '610', name: 'Drab Brown Dark', hex: '#796047', rgb: [121, 96, 71], symbol: 'ů' },
  { code: '3047', name: 'Yellow Beige Light', hex: '#E7D6C1', rgb: [231, 214, 193], symbol: 'Ű' },
  { code: '3046', name: 'Yellow Beige Medium', hex: '#D8BC9A', rgb: [216, 188, 154], symbol: 'ű' },
  { code: '3045', name: 'Yellow Beige Dark', hex: '#BC966A', rgb: [188, 150, 106], symbol: 'Ų' },
  { code: '167', name: 'Yellow Beige Very Dark', hex: '#A77C49', rgb: [167, 124, 73], symbol: 'ų' },
  { code: '746', name: 'Off White', hex: '#FCFCEE', rgb: [252, 252, 238], symbol: 'Ŵ' },
  { code: '677', name: 'Old Gold Very Light', hex: '#F5ECCB', rgb: [245, 236, 203], symbol: 'ŵ' },
  { code: '422', name: 'Hazelnut Brown Light', hex: '#C69F7B', rgb: [198, 159, 123], symbol: 'Ŷ' },
  { code: '3828', name: 'Hazelnut Brown', hex: '#B78B61', rgb: [183, 139, 97], symbol: 'ŷ' },
  { code: '420', name: 'Hazelnut Brown Dark', hex: '#A07042', rgb: [160, 112, 66], symbol: 'Ÿ' },
  {
    code: '869',
    name: 'Hazelnut Brown Very Dark',
    hex: '#835E39',
    rgb: [131, 94, 57],
    symbol: 'Ź',
  },
  { code: '728', name: 'Topaz', hex: '#E4B468', rgb: [228, 180, 104], symbol: 'ź' },
  { code: '783', name: 'Topaz Medium', hex: '#CE9124', rgb: [206, 145, 36], symbol: 'Ż' },
  { code: '782', name: 'Topaz Dark', hex: '#AE7720', rgb: [174, 119, 32], symbol: 'ż' },
  { code: '781', name: 'Topaz Very Dark', hex: '#A26D20', rgb: [162, 109, 32], symbol: 'Ž' },
  { code: '780', name: 'Topaz Ultra Very Dark', hex: '#94631A', rgb: [148, 99, 26], symbol: 'ž' },
  { code: '676', name: 'Old Gold Light', hex: '#E5CE97', rgb: [229, 206, 151], symbol: 'ſ' },
  { code: '729', name: 'Old Gold Medium', hex: '#D0A53E', rgb: [208, 165, 62], symbol: '─' },
  { code: '680', name: 'Old Gold Dark', hex: '#BC8D0E', rgb: [188, 141, 14], symbol: '━' },
  { code: '3829', name: 'Old Gold Very Dark', hex: '#A98204', rgb: [169, 130, 4], symbol: '│' },
  { code: '3822', name: 'Straw Light', hex: '#F6DC98', rgb: [246, 220, 152], symbol: '┃' },
  { code: '3821', name: 'Straw', hex: '#F3CE75', rgb: [243, 206, 117], symbol: '┄' },
  { code: '3820', name: 'Straw Dark', hex: '#DFB65F', rgb: [223, 182, 95], symbol: '┅' },
  { code: '3852', name: 'Straw Very Dark', hex: '#CD9D37', rgb: [205, 157, 55], symbol: '┆' },
  { code: '445', name: 'Lemon Light', hex: '#FFFB8B', rgb: [255, 251, 139], symbol: '┇' },
  { code: '307', name: 'Lemon', hex: '#FDED54', rgb: [253, 237, 84], symbol: '┈' },
  { code: '973', name: 'Canary Bright', hex: '#FFE300', rgb: [255, 227, 0], symbol: '┉' },
  { code: '444', name: 'Lemon Dark', hex: '#FFD600', rgb: [255, 214, 0], symbol: '┊' },
  {
    code: '3078',
    name: 'Golden Yellow Very Light',
    hex: '#FDF9CD',
    rgb: [253, 249, 205],
    symbol: '┋',
  },
  { code: '727', name: 'Topaz Very Light', hex: '#FFF1AF', rgb: [255, 241, 175], symbol: '┌' },
  { code: '726', name: 'Topaz Light', hex: '#FDD755', rgb: [253, 215, 85], symbol: '┍' },
  { code: '725', name: 'Topaz Medium Light', hex: '#FFC840', rgb: [255, 200, 64], symbol: '┎' },
  { code: '972', name: 'Canary Deep', hex: '#FFB515', rgb: [255, 181, 21], symbol: '┏' },
  { code: '745', name: 'Yellow Pale Light', hex: '#FFE9AD', rgb: [255, 233, 173], symbol: '┐' },
  { code: '744', name: 'Yellow Pale', hex: '#FFE793', rgb: [255, 231, 174], symbol: '┑' },
  { code: '743', name: 'Yellow Medium', hex: '#FED376', rgb: [254, 211, 118], symbol: '┒' },
  { code: '742', name: 'Tangerine Light', hex: '#FFBF57', rgb: [255, 191, 87], symbol: '┓' },
  { code: '741', name: 'Tangerine Medium', hex: '#FFA32B', rgb: [255, 163, 43], symbol: '└' },
  { code: '740', name: 'Tangerine', hex: '#FF8B00', rgb: [255, 139, 0], symbol: '┕' },
  { code: '970', name: 'Pumpkin Light', hex: '#F78B13', rgb: [247, 139, 19], symbol: '┖' },
  { code: '971', name: 'Pumpkin', hex: '#F67F00', rgb: [246, 127, 0], symbol: '┗' },
  { code: '947', name: 'Burnt Orange', hex: '#FF7B4D', rgb: [255, 123, 77], symbol: '┘' },
  { code: '946', name: 'Burnt Orange Medium', hex: '#EB6307', rgb: [235, 99, 7], symbol: '┙' },
  { code: '900', name: 'Burnt Orange Dark', hex: '#D15807', rgb: [209, 88, 7], symbol: '┚' },
  { code: '967', name: 'Apricot Very Light', hex: '#FFDED5', rgb: [255, 222, 213], symbol: '┛' },
  { code: '3824', name: 'Apricot Light', hex: '#FECDC2', rgb: [254, 205, 194], symbol: '├' },
  { code: '3341', name: 'Apricot', hex: '#FCAB98', rgb: [252, 171, 152], symbol: '┝' },
  { code: '3340', name: 'Apricot Medium', hex: '#FF836F', rgb: [255, 131, 111], symbol: '┞' },
  { code: '608', name: 'Burnt Orange Bright', hex: '#FD5D35', rgb: [253, 93, 53], symbol: '┟' },
  { code: '606', name: 'Orange Red Bright', hex: '#FA3203', rgb: [250, 50, 3], symbol: '┠' },
  { code: '951', name: 'Tawny Light', hex: '#FFE2CF', rgb: [255, 226, 207], symbol: '┡' },
  {
    code: '3856',
    name: 'Mahogany Ultra Very Light',
    hex: '#FFD3B5',
    rgb: [255, 211, 181],
    symbol: '┢',
  },
  { code: '722', name: 'Orange Spice Light', hex: '#F7976F', rgb: [247, 151, 111], symbol: '┣' },
  { code: '721', name: 'Orange Spice Medium', hex: '#F27842', rgb: [242, 120, 66], symbol: '┤' },
  { code: '720', name: 'Orange Spice Dark', hex: '#E55C1F', rgb: [229, 92, 31], symbol: '┥' },
  { code: '3825', name: 'Pumpkin Pale', hex: '#FDBD96', rgb: [253, 189, 150], symbol: '┦' },
  { code: '922', name: 'Copper Light', hex: '#E27323', rgb: [226, 115, 35], symbol: '┧' },
  { code: '921', name: 'Copper', hex: '#C66218', rgb: [198, 98, 24], symbol: '┨' },
  { code: '920', name: 'Copper Medium', hex: '#AC5414', rgb: [172, 84, 20], symbol: '┩' },
  { code: '919', name: 'Red Copper', hex: '#A64510', rgb: [166, 69, 16], symbol: '┪' },
  { code: '918', name: 'Red Copper Dark', hex: '#82340A', rgb: [130, 52, 10], symbol: '┫' },
  { code: '3770', name: 'Tawny Very Light', hex: '#FFEEE3', rgb: [255, 238, 227], symbol: '┬' },
  { code: '945', name: 'Tawny', hex: '#FBD5BB', rgb: [251, 213, 187], symbol: '┭' },
  { code: '402', name: 'Mahogany Very Light', hex: '#F7A777', rgb: [247, 167, 119], symbol: '┮' },
  { code: '3776', name: 'Mahogany Light', hex: '#CF7939', rgb: [207, 121, 57], symbol: '┯' },
  { code: '301', name: 'Mahogany Medium', hex: '#B35F2B', rgb: [179, 95, 43], symbol: '┰' },
  { code: '400', name: 'Mahogany Dark', hex: '#8F430F', rgb: [143, 67, 15], symbol: '┱' },
  { code: '300', name: 'Mahogany Very Dark', hex: '#6F2F00', rgb: [111, 47, 0], symbol: '┲' },
  { code: '3823', name: 'Yellow Ultra Pale', hex: '#FFFDE3', rgb: [255, 253, 227], symbol: '┳' },
  { code: '3855', name: 'Autumn Gold Light', hex: '#FAD396', rgb: [250, 211, 150], symbol: '┴' },
  { code: '3854', name: 'Autumn Gold Medium', hex: '#F2AF68', rgb: [242, 175, 104], symbol: '┵' },
  { code: '3853', name: 'Autumn Gold Dark', hex: '#F29746', rgb: [242, 150, 70], symbol: '┶' },
  { code: '3827', name: 'Golden Brown Pale', hex: '#F7BB77', rgb: [247, 187, 119], symbol: '┷' },
  { code: '977', name: 'Golden Brown Light', hex: '#DC9C56', rgb: [220, 156, 86], symbol: '┸' },
  { code: '976', name: 'Golden Brown Medium', hex: '#C28142', rgb: [194, 129, 66], symbol: '┹' },
  { code: '3826', name: 'Golden Brown', hex: '#AD7239', rgb: [173, 114, 57], symbol: '┺' },
  { code: '975', name: 'Golden Brown Dark', hex: '#914F12', rgb: [145, 79, 18], symbol: '┻' },
  { code: '948', name: 'Peach Very Light', hex: '#FEE7DA', rgb: [254, 231, 218], symbol: '┼' },
  { code: '754', name: 'Peach Light', hex: '#F7CBBF', rgb: [247, 203, 191], symbol: '┽' },
  {
    code: '3771',
    name: 'Terra Cotta Ultra Very Light',
    hex: '#F4BBA9',
    rgb: [244, 187, 169],
    symbol: '┾',
  },
  {
    code: '758',
    name: 'Terra Cotta Very Light',
    hex: '#EEAA9B',
    rgb: [238, 170, 155],
    symbol: '┿',
  },
  { code: '3778', name: 'Terra Cotta Light', hex: '#D98978', rgb: [217, 137, 120], symbol: '╀' },
  { code: '356', name: 'Terra Cotta Medium', hex: '#C56A5B', rgb: [197, 106, 91], symbol: '╁' },
  { code: '3830', name: 'Terra Cotta', hex: '#B95544', rgb: [185, 85, 68], symbol: '╂' },
  { code: '355', name: 'Terra Cotta Dark', hex: '#984436', rgb: [152, 68, 54], symbol: '╃' },
  { code: '3777', name: 'Terra Cotta Very Dark', hex: '#863022', rgb: [134, 48, 34], symbol: '╄' },
  {
    code: '3779',
    name: 'Rosewood Ultra Very Light',
    hex: '#F8CAC8',
    rgb: [248, 202, 200],
    symbol: '╅',
  },
  { code: '3859', name: 'Rosewood Light', hex: '#BA8B7C', rgb: [186, 139, 124], symbol: '╆' },
  { code: '3858', name: 'Rosewood Medium', hex: '#964A3F', rgb: [150, 74, 63], symbol: '╇' },
  { code: '3857', name: 'Rosewood Dark', hex: '#68251A', rgb: [104, 37, 26], symbol: '╈' },
  {
    code: '3774',
    name: 'Desert Sand Very Light',
    hex: '#F3E1D7',
    rgb: [243, 225, 215],
    symbol: '╉',
  },
  { code: '950', name: 'Desert Sand Light', hex: '#EED3C4', rgb: [238, 211, 196], symbol: '╊' },
  { code: '3064', name: 'Desert Sand', hex: '#C48E70', rgb: [196, 142, 112], symbol: '╋' },
  { code: '407', name: 'Desert Sand Medium', hex: '#BB8161', rgb: [187, 129, 97], symbol: '╌' },
  { code: '3773', name: 'Desert Sand Dark', hex: '#B67552', rgb: [182, 117, 82], symbol: '╍' },
  { code: '3772', name: 'Desert Sand Very Dark', hex: '#A06C50', rgb: [160, 108, 80], symbol: '╎' },
  {
    code: '632',
    name: 'Desert Sand Ultra Very Dark',
    hex: '#875539',
    rgb: [135, 85, 57],
    symbol: '╏',
  },
  { code: '453', name: 'Shell Gray Light', hex: '#D7CECB', rgb: [215, 206, 203], symbol: '═' },
  { code: '452', name: 'Shell Gray Medium', hex: '#C0B3AE', rgb: [192, 179, 174], symbol: '║' },
  { code: '451', name: 'Shell Gray Dark', hex: '#917B73', rgb: [145, 123, 115], symbol: '╒' },
  { code: '3861', name: 'Cocoa Light', hex: '#A68881', rgb: [166, 136, 129], symbol: '╓' },
  { code: '3860', name: 'Cocoa', hex: '#7D5D57', rgb: [125, 93, 87], symbol: '╔' },
  { code: '779', name: 'Cocoa Dark', hex: '#624B45', rgb: [98, 75, 69], symbol: '╕' },
  { code: '712', name: 'Cream', hex: '#FFFBEF', rgb: [255, 251, 239], symbol: '╖' },
  { code: '739', name: 'Tan Ultra Very Light', hex: '#F8E4C8', rgb: [248, 228, 200], symbol: '╗' },
  { code: '738', name: 'Tan Very Light', hex: '#ECCC9E', rgb: [236, 204, 158], symbol: '╘' },
  { code: '437', name: 'Tan Light', hex: '#E4BB8E', rgb: [228, 187, 142], symbol: '╙' },
  { code: '436', name: 'Tan', hex: '#CB9051', rgb: [203, 144, 81], symbol: '╚' },
  { code: '435', name: 'Brown Very Light', hex: '#B87748', rgb: [184, 119, 72], symbol: '╛' },
  { code: '434', name: 'Brown Light', hex: '#985E33', rgb: [152, 94, 51], symbol: '╜' },
  { code: '433', name: 'Brown Medium', hex: '#7A451F', rgb: [122, 69, 31], symbol: '╝' },
  { code: '801', name: 'Coffee Brown Dark', hex: '#653919', rgb: [101, 57, 25], symbol: '╞' },
  { code: '898', name: 'Coffee Brown Very Dark', hex: '#492A13', rgb: [73, 42, 19], symbol: '╟' },
  { code: '938', name: 'Coffee Brown Ultra Dark', hex: '#361F0E', rgb: [54, 31, 14], symbol: '╠' },
  { code: '3371', name: 'Black Brown', hex: '#1E1108', rgb: [30, 17, 8], symbol: '╡' },
  {
    code: '543',
    name: 'Beige Brown Ultra Very Light',
    hex: '#F2E3CE',
    rgb: [242, 227, 206],
    symbol: '╢',
  },
  { code: '3864', name: 'Mocha Beige Light', hex: '#CBB69C', rgb: [203, 182, 156], symbol: '╣' },
  { code: '3863', name: 'Mocha Beige Medium', hex: '#A4835C', rgb: [164, 131, 92], symbol: '╤' },
  { code: '3862', name: 'Mocha Beige Dark', hex: '#8A6E4E', rgb: [138, 110, 78], symbol: '╥' },
  { code: '3031', name: 'Mocha Brown Very Dark', hex: '#4B3C2A', rgb: [75, 60, 42], symbol: '╦' },
  { code: 'B5200', name: 'Snow White', hex: '#FFFFFF', rgb: [255, 255, 255], symbol: '╧' },
  { code: 'White', name: 'White', hex: '#FCFBF8', rgb: [252, 251, 248], symbol: '╨' },
  { code: '3865', name: 'Winter White', hex: '#F9F7F1', rgb: [249, 247, 241], symbol: '╩' },
  { code: 'Ecru', name: 'Ecru', hex: '#F0EADA', rgb: [240, 234, 218], symbol: '╪' },
  { code: '822', name: 'Beige Gray Light', hex: '#E7E2D3', rgb: [231, 226, 211], symbol: '╫' },
  { code: '644', name: 'Beige Gray Medium', hex: '#DDD8CB', rgb: [221, 216, 203], symbol: '╬' },
  { code: '642', name: 'Beige Gray Dark', hex: '#A49878', rgb: [164, 152, 120], symbol: '╭' },
  { code: '640', name: 'Beige Gray Very Dark', hex: '#857B61', rgb: [133, 123, 97], symbol: '╮' },
  { code: '3787', name: 'Brown Gray Dark', hex: '#625D50', rgb: [98, 93, 80], symbol: '╯' },
  { code: '3021', name: 'Brown Gray Very Dark', hex: '#4F4B41', rgb: [79, 75, 65], symbol: '╰' },
  {
    code: '3024',
    name: 'Brown Gray Very Light',
    hex: '#EBEAE7',
    rgb: [235, 234, 231],
    symbol: '╱',
  },
  { code: '3023', name: 'Brown Gray Light', hex: '#B1AA97', rgb: [177, 170, 151], symbol: '╲' },
  { code: '3022', name: 'Brown Gray Medium', hex: '#8E9078', rgb: [142, 144, 120], symbol: '╳' },
  { code: '535', name: 'Ash Gray Very Light', hex: '#636458', rgb: [99, 100, 88], symbol: '╴' },
  {
    code: '3033',
    name: 'Mocha Brown Very Light',
    hex: '#E3D8CC',
    rgb: [227, 216, 204],
    symbol: '╵',
  },
  { code: '3782', name: 'Mocha Brown Light', hex: '#D2BCA6', rgb: [210, 188, 166], symbol: '╶' },
  { code: '3032', name: 'Mocha Brown Medium', hex: '#B39F8B', rgb: [179, 159, 139], symbol: '╷' },
  { code: '3790', name: 'Beige Gray Ultra Dark', hex: '#7F6A55', rgb: [127, 106, 85], symbol: '╸' },
  { code: '3781', name: 'Mocha Brown Dark', hex: '#6B5743', rgb: [107, 87, 67], symbol: '╹' },
  {
    code: '3866',
    name: 'Mocha Brown Ultra Very Light',
    hex: '#FAF6F0',
    rgb: [250, 246, 240],
    symbol: '╺',
  },
  {
    code: '842',
    name: 'Beige Brown Very Light',
    hex: '#D1BAA1',
    rgb: [209, 186, 161],
    symbol: '╻',
  },
  { code: '841', name: 'Beige Brown Light', hex: '#B69B7E', rgb: [182, 155, 126], symbol: '╼' },
  { code: '840', name: 'Beige Brown Medium', hex: '#9A7C5C', rgb: [154, 124, 92], symbol: '╽' },
  { code: '839', name: 'Beige Brown Dark', hex: '#675541', rgb: [103, 85, 65], symbol: '╾' },
  { code: '838', name: 'Beige Brown Very Dark', hex: '#594937', rgb: [89, 73, 55], symbol: '╿' },
  {
    code: '3072',
    name: 'Beaver Gray Very Light',
    hex: '#E6E8E8',
    rgb: [230, 232, 232],
    symbol: '▀',
  },
  { code: '648', name: 'Beaver Gray Light', hex: '#BCB4AC', rgb: [188, 180, 172], symbol: '▁' },
  { code: '647', name: 'Beaver Gray Medium', hex: '#B0A69C', rgb: [176, 166, 156], symbol: '▂' },
  { code: '646', name: 'Beaver Gray Dark', hex: '#877D73', rgb: [135, 125, 115], symbol: '▃' },
  { code: '645', name: 'Beaver Gray Very Dark', hex: '#6E655C', rgb: [110, 101, 92], symbol: '▄' },
  { code: '844', name: 'Beaver Gray Ultra Dark', hex: '#484848', rgb: [72, 72, 72], symbol: '▅' },
  { code: '762', name: 'Pearl Gray Very Light', hex: '#ECECEC', rgb: [236, 236, 236], symbol: '▆' },
  { code: '415', name: 'Pearl Gray', hex: '#D3D3D6', rgb: [211, 211, 214], symbol: '▇' },
  { code: '318', name: 'Steel Gray Light', hex: '#ABABAB', rgb: [171, 171, 171], symbol: '█' },
  { code: '414', name: 'Steel Gray Dark', hex: '#8C8C8C', rgb: [140, 140, 140], symbol: '▉' },
  { code: '168', name: 'Pewter Very Light', hex: '#D1D1D1', rgb: [209, 209, 209], symbol: '▊' },
  { code: '169', name: 'Pewter Light', hex: '#848484', rgb: [132, 132, 132], symbol: '▋' },
  { code: '317', name: 'Pewter Gray', hex: '#6C6C6C', rgb: [108, 108, 108], symbol: '▌' },
  { code: '413', name: 'Pewter Gray Dark', hex: '#565656', rgb: [86, 86, 86], symbol: '▍' },
  { code: '3799', name: 'Pewter Gray Very Dark', hex: '#424242', rgb: [66, 66, 66], symbol: '▎' },
  { code: '310', name: 'Black', hex: '#000000', rgb: [0, 0, 0], symbol: '▏' },
  { code: '1', name: 'White Tin', hex: '#E3E3E6', rgb: [227, 227, 230], symbol: '▐' },
  { code: '2', name: 'Tin', hex: '#D7D7D8', rgb: [215, 215, 216], symbol: '░' },
  { code: '3', name: 'Tin Medium', hex: '#B8B8BB', rgb: [184, 184, 187], symbol: '▒' },
  { code: '4', name: 'Tin Dark', hex: '#AEAEB1', rgb: [174, 174, 177], symbol: '▓' },
  { code: '5', name: 'Driftwood Light', hex: '#E3CCBE', rgb: [227, 204, 190], symbol: '▔' },
  { code: '6', name: 'Driftwood Medium Light', hex: '#DCC6B8', rgb: [220, 198, 184], symbol: '▕' },
  { code: '7', name: 'Driftwood', hex: '#8F7B6E', rgb: [143, 123, 110], symbol: '▖' },
  { code: '8', name: 'Driftwood Dark', hex: '#6A5046', rgb: [106, 80, 70], symbol: '▗' },
  { code: '9', name: 'Cocoa Very Dark', hex: '#552014', rgb: [85, 32, 14], symbol: '▘' },
  {
    code: '10',
    name: 'Tender Green Very Light',
    hex: '#EDFED9',
    rgb: [237, 254, 217],
    symbol: '▙',
  },
  { code: '11', name: 'Tender Green Light', hex: '#E2EDB5', rgb: [226, 237, 181], symbol: '▚' },
  { code: '12', name: 'Tender Green', hex: '#CDD99A', rgb: [205, 217, 154], symbol: '▛' },
  {
    code: '13',
    name: 'Nile Green Medium Light',
    hex: '#BFF6E0',
    rgb: [191, 246, 224],
    symbol: '▜',
  },
  { code: '14', name: 'Apple Green Pale', hex: '#D0FBB2', rgb: [208, 251, 178], symbol: '▝' },
  { code: '15', name: 'Apple Green', hex: '#D1EDA4', rgb: [209, 237, 164], symbol: '▞' },
  { code: '16', name: 'Chartreuse Light', hex: '#C9C258', rgb: [201, 194, 88], symbol: '▟' },
  { code: '17', name: 'Yellow Plum Light', hex: '#E5E272', rgb: [229, 226, 114], symbol: '■' },
  { code: '18', name: 'Yellow Plum', hex: '#D9D56D', rgb: [217, 213, 109], symbol: '□' },
  {
    code: '19',
    name: 'Autumn Gold Medium Light',
    hex: '#F7C95F',
    rgb: [247, 201, 95],
    symbol: '▢',
  },
  { code: '20', name: 'Shrimp', hex: '#F7AF93', rgb: [247, 175, 147], symbol: '▣' },
  { code: '21', name: 'Alizarin Light', hex: '#D79982', rgb: [215, 153, 130], symbol: '▤' },
  { code: '22', name: 'Alizarin', hex: '#BC604E', rgb: [188, 96, 78], symbol: '▥' },
  { code: '23', name: 'Apple Blossom', hex: '#EDE2ED', rgb: [237, 226, 237], symbol: '▦' },
  { code: '24', name: 'White Lavender', hex: '#E0D7EE', rgb: [224, 215, 238], symbol: '▧' },
  { code: '25', name: 'Lavender Ultra Light', hex: '#DAD2E9', rgb: [218, 210, 233], symbol: '▨' },
  { code: '26', name: 'Lavender Pale', hex: '#D7CAE6', rgb: [215, 202, 230], symbol: '▩' },
  { code: '27', name: 'White Violet', hex: '#F0EEF9', rgb: [240, 238, 249], symbol: '▪' },
  { code: '28', name: 'Eggplant Medium Light', hex: '#9086A9', rgb: [144, 134, 169], symbol: '▫' },
  { code: '29', name: 'Eggplant', hex: '#674076', rgb: [103, 64, 118], symbol: '▬' },
  { code: '30', name: 'Blueberry Medium Light', hex: '#7D77A5', rgb: [125, 119, 165], symbol: '▭' },
  { code: '31', name: 'Blueberry', hex: '#50518D', rgb: [80, 81, 141], symbol: '▮' },
  { code: '32', name: 'Blueberry Dark', hex: '#4D2E8A', rgb: [77, 46, 138], symbol: '▯' },
  { code: '33', name: 'Fuschia', hex: '#9C599C', rgb: [156, 89, 158], symbol: '▰' },
  { code: '34', name: 'Fuschia Dark', hex: '#7D3064', rgb: [125, 48, 100], symbol: '▱' },
  { code: '35', name: 'Fuschia Very Dark', hex: '#46052D', rgb: [70, 5, 45], symbol: '▲' },
];

// Lookup maps for O(1) access
const codeMap = new Map<string, DMCColor>();
const hexMap = new Map<string, DMCColor>();
const nameMap = new Map<string, DMCColor>();
const symbolMap = new Map<string, DMCColor>();

// Initialise lookup maps
for (const color of DMC_COLORS) {
  codeMap.set(color.code.toLowerCase(), color);
  hexMap.set(color.hex.toLowerCase(), color);
  nameMap.set(color.name.toLowerCase(), color);
  symbolMap.set(color.symbol, color);
}

// Convert hex to RGB
export function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace(/^#/, '');
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
  if (!result) return [128, 128, 128];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

// Convert RGB to hex
export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map(x => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
      .toUpperCase()
  );
}

// Calculate colour distance using weighted Euclidean distance (approximates human perception)
export function colorDistance(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  const rMean = (rgb1[0] + rgb2[0]) / 2;
  const dR = rgb1[0] - rgb2[0];
  const dG = rgb1[1] - rgb2[1];
  const dB = rgb1[2] - rgb2[2];
  const rWeight = 2 + rMean / 256;
  const gWeight = 4;
  const bWeight = 2 + (255 - rMean) / 256;
  return Math.sqrt(rWeight * dR * dR + gWeight * dG * dG + bWeight * dB * dB);
}

// Find DMC colour by code (e.g., "310", "B5200", "White")
export function findByCode(code: string): DMCColor | undefined {
  return codeMap.get(code.toLowerCase());
}

// Find DMC colour by hex value (with or without # prefix)
export function findByHex(hex: string): DMCColor | undefined {
  const normalised = hex.startsWith('#') ? hex.toLowerCase() : `#${hex.toLowerCase()}`;
  return hexMap.get(normalised);
}

// Find DMC colour by name (case-insensitive)
export function findByName(name: string): DMCColor | undefined {
  return nameMap.get(name.toLowerCase());
}

// Find DMC colour by symbol
export function findBySymbol(symbol: string): DMCColor | undefined {
  return symbolMap.get(symbol);
}

// Find DMC colour by RGB (exact match)
export function findByRgb(r: number, g: number, b: number): DMCColor | undefined {
  return DMC_COLORS.find(c => c.rgb[0] === r && c.rgb[1] === g && c.rgb[2] === b);
}

// Find the closest DMC colour to a given RGB value
export function findClosestDMC(rgb: [number, number, number]): DMCColor {
  let closest = DMC_COLORS[0];
  let minDist = Infinity;
  for (const dmc of DMC_COLORS) {
    const dist = colorDistance(rgb, dmc.rgb);
    if (dist < minDist) {
      minDist = dist;
      closest = dmc;
    }
  }
  return closest;
}

// Find closest DMC colour with distance information
export function findClosestDMCWithDistance(rgb: [number, number, number]): {
  color: DMCColor;
  distance: number;
} {
  let closest = DMC_COLORS[0];
  let minDist = Infinity;
  for (const dmc of DMC_COLORS) {
    const dist = colorDistance(rgb, dmc.rgb);
    if (dist < minDist) {
      minDist = dist;
      closest = dmc;
    }
  }
  return { color: closest, distance: minDist };
}

// Find N closest DMC colours to a given RGB value
export function findClosestDMCColors(
  rgb: [number, number, number],
  count: number = 5
): Array<{ color: DMCColor; distance: number }> {
  const distances = DMC_COLORS.map(dmc => ({
    color: dmc,
    distance: colorDistance(rgb, dmc.rgb),
  }));
  distances.sort((a, b) => a.distance - b.distance);
  return distances.slice(0, count);
}

// Search colours by partial name match
export function searchByName(query: string): DMCColor[] {
  const lowerQuery = query.toLowerCase();
  return DMC_COLORS.filter(c => c.name.toLowerCase().includes(lowerQuery));
}

// Get all colours in a colour family (based on name keywords)
export function getColorFamily(family: string): DMCColor[] {
  const lowerFamily = family.toLowerCase();
  return DMC_COLORS.filter(c => c.name.toLowerCase().includes(lowerFamily));
}

// Universal lookup: attempts to find colour by code, hex, name, or symbol
export function findDMC(query: string): DMCColor | undefined {
  return findByCode(query) || findByHex(query) || findByName(query) || findBySymbol(query);
}

// Get total colour count
export function getColorCount(): number {
  return DMC_COLORS.length;
}

// Get all available symbols
export function getAllSymbols(): string[] {
  return DMC_COLORS.map(c => c.symbol);
}

// Get all available codes
export function getAllCodes(): string[] {
  return DMC_COLORS.map(c => c.code);
}

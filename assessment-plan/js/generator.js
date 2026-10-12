// Client-side Word Docx Generator using JSZip and DOMParser
// Supports Basic Courses (10-column matrix, template_basic_single_kpi.docx) 
// and Elective Courses (8-column matrix, template_elective.docx)
// Uniform font sizing (16pt TH SarabunPSK), custom exam durations, dynamic KPIs & standards

// 55 Ministry of Education (สพฐ.) Basic Core Curriculum Standards
const CURRICULUM_STANDARDS = {
  // ภาษาไทย
  "ท 1.1": "ใช้กระบวนการอ่านสร้างความรู้และความคิดเพื่อนำไปใช้ตัดสินใจ แก้ปัญหาในการดำเนินชีวิต และมีนิสัยรักการอ่าน",
  "ท 2.1": "ใช้กระบวนการเขียนเขียนสื่อสาร เขียนเรียงความ ย่อความ และเขียนเรื่องราวในรูปแบบต่างๆ เขียนรายงานข้อมูลสารสนเทศและรายงานการศึกษาค้นคว้าอย่างมีประสิทธิภาพ",
  "ท 3.1": "สามารถเลือกฟังและดูอย่างมีวิจารณญาณ และพูดแสดงความรู้ ความคิด และความรู้สึกในโอกาสต่างๆ อย่างมีวิจารณญาณและสร้างสรรค์",
  "ท 4.1": "เข้าใจธรรมชาติของภาษาและหลักภาษาไทย การเปลี่ยนแปลงของภาษาและพลังของภาษา ภูมิปัญญาทางภาษา และรักษาภาษาไทยไว้เป็นสมบัติของชาติ",
  "ท 5.1": "เข้าใจและแสดงความคิดเห็น วิจารณ์วรรณคดีและวรรณกรรมไทยอย่างเห็นคุณค่าและนำมาประยุกต์ใช้ในชีวิตจริง",

  // คณิตศาสตร์ (ฉบับปรับปรุง 2560)
  "ค 1.1": "เข้าใจความหลากหลายของการแสดงจำนวน ระบบจำนวน การดำเนินการของจำนวน ผลที่เกิดขึ้นจากการดำเนินการ สมบัติของการดำเนินการ และนำไปใช้",
  "ค 1.2": "เข้าใจและวิเคราะห์แบบรูป ความสัมพันธ์ ฟังก์ชัน ลำดับและอนุกรม และนำไปใช้",
  "ค 1.3": "ใช้นิพจน์ สมการ และอสมการ อธิบายความสัมพันธ์หรือช่วยแก้ปัญหาที่กำหนดให้",
  "ค 2.1": "เข้าใจพื้นฐานเกี่ยวกับการวัด วัดและคาดคะเนขนาดของสิ่งที่ต้องการวัด และนำไปใช้",
  "ค 2.2": "เข้าใจและวิเคราะห์รูปเรขาคณิต สมบัติของรูปเรขาคณิต ความสัมพันธ์ระหว่างรูปเรขาคณิต และทฤษฎีบททางเรขาคณิต และนำไปใช้",
  "ค 3.1": "เข้าใจกระบวนการทางสถิติ และใช้ความรู้ทางสถิติในการแก้ปัญหา",
  "ค 3.2": "เข้าใจหลักการนับเบื้องต้น ความน่าจะเป็น และนำไปใช้",

  // วิทยาศาสตร์และเทคโนโลยี (ฉบับปรับปรุง 2560)
  "ว 1.1": "เข้าใจความหลากหลายของระบบนิเวศ ความสัมพันธ์ระหว่างสิ่งไม่มีชีวิตกับสิ่งมีชีวิต และความสัมพันธ์ระหว่างสิ่งมีชีวิตกับสิ่งมีชีวิตต่าง ๆ ในระบบนิเวศ การถ่ายทอดพลังงาน การเปลี่ยนแปลงแทนที่ในระบบนิเวศ ความหมายของประชากร ปัญหาและผลกระทบที่มีต่อทรัพยากรธรรมชาติและสิ่งแวดล้อม แนวทางในการอนุรักษ์ทรัพยากรธรรมชาติและการแก้ไขปัญหาสิ่งแวดล้อม รวมทั้งนำความรู้ไปใช้ประโยชน์",
  "ว 1.2": "เข้าใจสมบัติของสิ่งมีชีวิต หน่วยพื้นฐานของสิ่งมีชีวิต การลำเลียงสารเข้าและออกจากเซลล์ ความสัมพันธ์ของโครงสร้างและหน้าที่ของระบบต่าง ๆ ของสัตว์และมนุษย์ที่ทำงานสัมพันธ์กัน ความสัมพันธ์ของโครงสร้างและหน้าที่ของอวัยวะต่าง ๆ ของพืชที่ทำงานสัมพันธ์กัน รวมทั้งนำความรู้ไปใช้ประโยชน์",
  "ว 1.3": "เข้าใจกระบวนการและความสำคัญของการถ่ายทอดลักษณะทางพันธุกรรม สารพันธุกรรม การเปลี่ยนแปลงทางพันธุกรรมที่มีผลต่อสิ่งมีชีวิต ความหลากหลายทางชีวภาพและวิวัฒนาการของสิ่งมีชีวิต รวมทั้งนำความรู้ไปใช้ประโยชน์",
  "ว 2.1": "เข้าใจสมบัติของสสาร องค์ประกอบของสสาร ความสัมพันธ์ระหว่างสมบัติของสสารกับโครงสร้างและแรงยึดเหนี่ยวระหว่างอนุภาค หลักและธรรมชาติของการเปลี่ยนแปลงสถานะของสสาร การเกิดสารละลาย และการเกิดปฏิกิริยาเคมี",
  "ว 2.2": "เข้าใจธรรมชาติของแรงในชีวิตประจำวัน ผลของแรงที่กระทำต่อวัตถุ ลักษณะการเคลื่อนที่แบบต่าง ๆ ของวัตถุ รวมทั้งนำความรู้ไปใช้ประโยชน์",
  "ว 2.3": "เข้าใจความหมายของพลังงาน การเปลี่ยนแปลงและการถ่ายโอนพลังงาน ปฏิสัมพันธ์ระหว่างสสารและพลังงาน พลังงานในชีวิตประจำวัน ธรรมชาติของคลื่น ปรากฏการณ์ที่เกี่ยวข้องกับเสียง แสง และคลื่นแม่เหล็กไฟฟ้า รวมทั้งนำความรู้ไปใช้ประโยชน์",
  "ว 3.1": "เข้าใจองค์ประกอบ ลักษณะ กระบวนการเกิด และวิวัฒนาการของเอกภพ กาแล็กซี ดาวฤกษ์ และระบบสุริยะ รวมทั้งปฏิสัมพันธ์ภายในระบบสุริยะที่ส่งผลต่อสิ่งมีชีวิต และการประยุกต์ใช้เทคโนโลยีอวกาศ",
  "ว 3.2": "เข้าใจองค์ประกอบและความสัมพันธ์ของระบบโลก กระบวนการเปลี่ยนแปลงภายในโลกและบนผิวโลก ธรณีพิบัติภัย กระบวนการเปลี่ยนแปลงลมฟ้าอากาศและภูมิอากาศโลก รวมทั้งผลต่อสิ่งมีชีวิตและสิ่งแวดล้อม",
  "ว 4.1": "เข้าใจแนวคิดหลักของเทคโนโลยีเพื่อการดำรงชีวิตในสังคมที่มีการเปลี่ยนแปลงอย่างรวดเร็ว ใช้ความรู้และทักษะทางด้านวิทยาศาสตร์ คณิตศาสตร์ และศาสตร์อื่น ๆ เพื่อแก้ปัญหาหรือพัฒนางานอย่างมีความคิดสร้างสรรค์ด้วยกระบวนการออกแบบเชิงวิศวกรรม เลือกใช้เทคโนโลยีอย่างเหมาะสมโดยคำนึงถึงผลกระทบต่อชีวิต สังคม และสิ่งแวดล้อม",
  "ว 4.2": "เข้าใจและใช้แนวคิดเชิงคำนวณในการแก้ปัญหาที่พบในชีวิตจริงอย่างเป็นขั้นตอนและเป็นระบบ ใช้เทคโนโลยีสารสนเทศและการสื่อสารในการเรียนรู้ การทำงาน และการแก้ปัญหาได้อย่างมีประสิทธิภาพ รู้เท่าทัน และมีจริยธรรม",

  // สังคมศึกษา ศาสนา และวัฒนธรรม (ฉบับปรับปรุง 2560)
  "ส 1.1": "รู้และเข้าใจประวัติ ความสำคัญ ศาสดา หลักธรรมของพระพุทธศาสนาหรือศาสนาที่ตนนับถือและศาสนาอื่น มีศรัทธาที่ถูกต้อง ยึดมั่น และปฏิบัติตามหลักธรรม เพื่ออยู่ร่วมกันอย่างสันติสุข",
  "ส 1.2": "เข้าใจ ตระหนักและปฏิบัติตนเป็นศาสนิกชนที่ดี และธำรงรักษาพระพุทธศาสนาหรือศาสนาที่ตนนับถือ",
  "ส 2.1": "เข้าใจและปฏิบัติตนตามหน้าที่ของการเป็นพลเมืองดี มีค่านิยมที่ดีงาม และธำรงรักษาประเพณีและวัฒนธรรมไทย ดำรงชีวิตอยู่ร่วมกันในสังคมไทยและสังคมโลกอย่างสันติสุข",
  "ส 2.2": "เข้าใจระบบการเมืองการปกครองในสังคมปัจจุบัน ยึดมั่น ศรัทธา และธำรงรักษาไว้ซึ่งการปกครองระบอบประชาธิปไตยอันมีพระมหากษัตริย์ทรงเป็นประมุข",
  "ส 3.1": "เข้าใจและสามารถบริหารจัดการทรัพยากรในการผลิตและการบริโภค การใช้ทรัพยากรที่มีอยู่จำกัดได้อย่างมีประสิทธิภาพและคุ้มค่า รวมทั้งเข้าใจหลักการของเศรษฐกิจพอเพียง เพื่อการดำรงชีวิตอย่างมีดุลยภาพ",
  "ส 3.2": "เข้าใจระบบและสถาบันทางเศรษฐกิจต่าง ๆ ความสัมพันธ์ทางเศรษฐกิจ และความจำเป็นของการร่วมมือกันทางเศรษฐกิจในสังคมโลก",
  "ส 4.1": "เข้าใจความหมาย ความสำคัญของเวลาและยุคสมัยทางประวัติศาสตร์ สามารถใช้วิธีการทางประวัติศาสตร์มาวิเคราะห์เหตุการณ์ต่าง ๆ อย่างเป็นระบบ",
  "ส 4.2": "เข้าใจพัฒนาการของมนุษยชาติจากอดีตจนถึงปัจจุบัน ในด้านความสัมพันธ์และการเปลี่ยนแปลงของเหตุการณ์อย่างต่อเนื่อง ตระหนักถึงความสำคัญและสามารถวิเคราะห์ผลกระทบที่เกิดขึ้น",
  "ส 4.3": "เข้าใจความเป็นมาของชาติไทย วัฒนธรรม ภูมิปัญญาไทย มีความรัก ความภูมิใจและธำรงความเป็นไทย",
  "ส 5.1": "เข้าใจลักษณะทางกายภาพของโลกและความสัมพันธ์ของสรรพสิ่งซึ่งมีผลต่อกัน ใช้แผนที่และเครื่องมือทางภูมิศาสตร์ในการค้นหา วิเคราะห์ และสรุปข้อมูลตามกระบวนการทางภูมิศาสตร์ ตลอดจนใช้ภูมิสารสนเทศอย่างมีประสิทธิภาพ",
  "ส 5.2": "เข้าใจปฏิสัมพันธ์ระหว่างมนุษย์กับสิ่งแวดล้อมทางกายภาพที่ก่อให้เกิดการสร้างสรรค์วิถีการดำเนินชีวิต มีจิตสำนึกและมีส่วนร่วมในการอนุรักษ์ทรัพยากรและสิ่งแวดล้อมเพื่อการพัฒนาที่ยั่งยืน",

  // สุขศึกษาและพลศึกษา
  "พ 1.1": "เข้าใจธรรมชาติของการเจริญเติบโตและพัฒนาการของมนุษย์",
  "พ 2.1": "เข้าใจและเห็นคุณค่าตนเอง ครอบครัว เพศศึกษา และมีทักษะในการดำเนินชีวิต",
  "พ 3.1": "เข้าใจ มีทักษะในการเคลื่อนไหว กิจกรรมทางกาย การเล่นเกม และกีฬา",
  "พ 3.2": "รักการออกกำลังกาย การเล่นเกม และการเล่นกีฬา ปฏิบัติเป็นประจำอย่างสม่ำเสมอ มีวินัย เคารพสิทธิ กฎ กติกา มีน้ำใจนักกีฬา มีจิตวิญญาณในการแข่งขัน และชื่นชมในสุนทรียภาพของการกีฬา",
  "พ 4.1": "เห็นคุณค่าและมีทักษะในการสร้างเสริมสุขภาพ การดำรงสุขภาพ การป้องกันโรคและการสร้างเสริมสมรรถภาพเพื่อสุขภาพ",
  "พ 5.1": "ป้องกันและหลีกเลี่ยงปัจจัยเสี่ยง พฤติกรรมเสี่ยงต่อสุขภาพ อุบัติเหตุ การใช้ยา สารเสพติด และความรุนแรง",

  // ศิลปะ
  "ศ 1.1": "สร้างสรรค์งานทัศนศิลป์ตามจินตนาการ และความคิดสร้างสรรค์ วิเคราะห์ วิพากษ์ วิจารณ์คุณค่างานทัศนศิลป์ ถ่ายทอดความรู้สึก ความคิดต่องานศิลปะอย่างอิสระ ชื่นชม และประยุกต์ใช้ในชีวิตประจำวัน",
  "ศ 1.2": "เข้าใจความสัมพันธ์ระหว่างทัศนศิลป์ ประวัติศาสตร์ และวัฒนธรรม เห็นคุณค่างานทัศนศิลป์ที่เป็นมรดกทางวัฒนธรรม ภูมิปัญญาท้องถิ่น ภูมิปัญญาไทย และสากล",
  "ศ 2.1": "เข้าใจและแสดงออกทางดนตรีอย่างสร้างสรรค์ วิเคราะห์ วิพากษ์วิจารณ์คุณค่าดนตรี ถ่ายทอดความรู้สึก ความคิดต่อดนตรีอย่างอิสระ ชื่นชม และประยุกต์ใช้ในชีวิตประจำวัน",
  "ศ 2.2": "เข้าใจความสัมพันธ์ระหว่างดนตรี ประวัติศาสตร์ และวัฒนธรรม เห็นคุณค่าของดนตรีที่เป็นมรดกทางวัฒนธรรม ภูมิปัญญาท้องถิ่น ภูมิปัญญาไทยและสากล",
  "ศ 3.1": "เข้าใจ และแสดงออกทางนาฏศิลป์อย่างสร้างสรรค์ วิเคราะห์ วิพากษ์วิจารณ์คุณค่านาฏศิลป์ ถ่ายทอดความรู้สึก ความคิดอย่างอิสระ ชื่นชม และประยุกต์ใช้ในชีวิตประจำวัน",
  "ศ 3.2": "เข้าใจความสัมพันธ์ระหว่างนาฏศิลป์ ประวัติศาสตร์และวัฒนธรรม เห็นคุณค่าของนาฏศิลป์ที่เป็นมรดกทางวัฒนธรรม ภูมิปัญญาท้องถิ่น ภูมิปัญญาไทยและสากล",

  // การงานอาชีพ
  "ง 1.1": "เข้าใจการทำงาน มีความคิดสร้างสรรค์ มีทักษะกระบวนการทำงาน ทักษะการจัดการ ทักษะกระบวนการแก้ปัญหา ทักษะการทำงานร่วมกัน และทักษะการแสวงหาความรู้ มีคุณธรรมและลักษณะนิสัยในการทำงาน มีจิตสำนึกในการใช้พลังงาน ทรัพยากร และสิ่งแวดล้อม เพื่อการดำรงชีวิตและครอบครัว",
  "ง 2.1": "เข้าใจ มีทักษะที่จำเป็น มีประสบการณ์ เห็นแนวทางในงานอาชีพ ใช้เทคโนโลยีเพื่อพัฒนาอาชีพ มีคุณธรรม และมีเจตคติที่ดีต่ออาชีพ",

  // ภาษาต่างประเทศ
  "ต 1.1": "เข้าใจและตีความเรื่องที่ฟังและอ่านจากสื่อประเภทต่าง ๆ และแสดงความคิดเห็นอย่างมีเหตุผล",
  "ต 1.2": "มีทักษะการสื่อสารทางภาษาในการแลกเปลี่ยนข้อมูลข่าวสาร แสดงความรู้สึกและความคิดเห็นอย่างมีประสิทธิภาพ",
  "ต 1.3": "นำเสนอข้อมูลข่าวสาร ความคิดรวบยอด และความคิดเห็นในเรื่องต่าง ๆ โดยการพูดและการเขียน",
  "ต 2.1": "เข้าใจความสัมพันธ์ระหว่างภาษากับวัฒนธรรมของเจ้าของภาษา และนำไปใช้ได้อย่างเหมาะสมกับกาลเทศะ",
  "ต 2.2": "เข้าใจความเหมือนและความแตกต่างระหว่างภาษาและวัฒนธรรมของเจ้าของภาษากับภาษาและวัฒนธรรมไทย และนำมาใช้อย่างถูกต้องและเหมาะสม",
  "ต 3.1": "ใช้ภาษาต่างประเทศในการเชื่อมโยงความรู้กับกลุ่มสาระการเรียนรู้อื่น และเป็นพื้นฐานในการพัฒนา แสวงหาความรู้ และเปิดโลกทัศน์ของตน",
  "ต 4.1": "ใช้ภาษาต่างประเทศในสถานการณ์ต่าง ๆ ทั้งในห้องเรียน ชุมชน และสังคม",
  "ต 4.2": "ใช้ภาษาต่างประเทศเป็นเครื่องมือพื้นฐานในการศึกษาต่อ การประกอบอาชีพ และการแลกเปลี่ยนเรียนรู้กับสังคมโลก"
};

// ---------- Text normalization helpers ----------
const LEADING_NUM_RE = /^(?:ผลการเรียนรู้\s*(?:ข้อ(?:ที่)?|ที่)?\s*\d+(?:\.\d+)*\s*[\.\:\)]?\s*|ข้อ(?:ที่)?\s*\d+(?:\.\d+)*\s*[\.\:\)]?\s*|\(?\d{1,2}(?:\.\d{1,2})+\s*[\.\:\)]?\s*|\(?\d{1,2}\s*[\.\:\)]\s*|\d{1,2}\s+(?=[ก-๙A-Za-z]))/;
const NOISE_OUTCOME_RE = /^(?:จุดประสงค์(?:ชั้นปี|การเรียนรู้)?|มาตรฐานการเรียนรู้\s*\/?\s*ตัวชี้วัด(?:\s*\/?\s*ผลการเรียนรู้)?|ผลการเรียนรู้|(?:(?:ผลการเรียนรู้\s*)?(?:ข้อ(?:ที่)?|ที่)?\s*\d+(?:\s*[\-\,]\s*\d+)*[\s,]*)+|รวม(?:ทั้งสิ้น|คะแนน)?|[\d\s,\-\.]+)$/;

const PUA_THAI_MAP = {
  '\uF700': '\u0E10', '\uF701': '\u0E34', '\uF702': '\u0E35', '\uF703': '\u0E36',
  '\uF704': '\u0E37', '\uF705': '\u0E48', '\uF706': '\u0E49', '\uF707': '\u0E4A',
  '\uF708': '\u0E4B', '\uF709': '\u0E4C', '\uF70A': '\u0E48', '\uF70B': '\u0E49',
  '\uF70C': '\u0E4A', '\uF70D': '\u0E4B', '\uF70E': '\u0E4C', '\uF70F': '\u0E0D',
  '\uF710': '\u0E31', '\uF711': '\u0E4D', '\uF712': '\u0E47', '\uF713': '\u0E48',
  '\uF714': '\u0E49', '\uF715': '\u0E4A', '\uF716': '\u0E4B', '\uF717': '\u0E4C',
  '\uF718': '\u0E38', '\uF719': '\u0E39', '\uF71A': '\u0E3A'
};

const BROKEN_THAI_WORDS = [
  [/ใน\s*ปัจจุบัน\s*ทรัพยากร\s*ธรรมชาติ\s*ใน\s*ปัจจุบัน/g, 'ในปัจจุบัน'],
  [/ทรัพยากร\s*ธรรม\s*ชาติ/g, 'ทรัพยากรธรรมชาติ'],
  [/ทรัพยากร\s+ธรรมชาติ/g, 'ทรัพยากรธรรมชาติ'],
  [/ธรรม\s+ชาติ/g, 'ธรรมชาติ'],
  [/สิ่ง\s+แวดล้อม/g, 'สิ่งแวดล้อม'],
  [/สิ่งแวดล้อม\s+รอบตัว/g, 'สิ่งแวดล้อมรอบตัว'],
  [/ความ\s+สัมพันธ์/g, 'ความสัมพันธ์'],
  [/ความ\s+สำคัญ/g, 'ความสำคัญ'],
  [/จับใจความ\s+สำคัญ/g, 'จับใจความสำคัญ'],
  [/ความ\s+สนใจ/g, 'ความสนใจ'],
  [/ความ\s+คิดเห็น/g, 'ความคิดเห็น'],
  [/ความ\s+ขัดแย้ง/g, 'ความขัดแย้ง'],
  [/ความ\s+ร่วมมือ/g, 'ความร่วมมือ'],
  [/ความ\s+ปลอดภัย/g, 'ความปลอดภัย'],
  [/ความน่า\s+จะเป็น/g, 'ความน่าจะเป็น'],
  [/ความ\s+น่าจะเป็น/g, 'ความน่าจะเป็น'],
  [/การ\s*เปลี่ยน\s+แปลง/g, 'การเปลี่ยนแปลง'],
  [/การ\s+เปลี่ยนแปลง/g, 'การเปลี่ยนแปลง'],
  [/เปลี่ยน\s+แปลง/g, 'เปลี่ยนแปลง'],
  [/กระบวน\s+การ/g, 'กระบวนการ'],
  [/ต่อ\s+ต้าน/g, 'ต่อต้าน'],
  [/ป้อง\s+กัน/g, 'ป้องกัน'],
  [/เรื่อง\s+ราว/g, 'เรื่องราว'],
  [/มีส่วน\s+ร่วม/g, 'มีส่วนร่วม'],
  [/ส่วน\s+ร่วม/g, 'ส่วนร่วม'],
  [/กลุ่ม\s*สาระ\s+การเรียนรู้/g, 'กลุ่มสาระการเรียนรู้'],
  [/สาระ\s+การเรียนรู้/g, 'สาระการเรียนรู้'],
  [/คริสต์\s+ศตวรรษ/g, 'คริสต์ศตวรรษ'],
  [/ไมโคร\s+คอนโทรลเลอร์/g, 'ไมโครคอนโทรลเลอร์'],
  [/อิเล็ก\s+ทรอนิกส์/g, 'อิเล็กทรอนิกส์'],
  [/จำนวน\s+อตรรกยะ/g, 'จำนวนอตรรกยะ'],
  [/อตรรก\s+ยะ/g, 'อตรรกยะ'],
  [/เลข\s+ยกกำลัง/g, 'เลขยกกำลัง'],
  [/กำลัง\s+สอง/g, 'กำลังสอง'],
  [/อาหารจาน\s+เดียว/g, 'อาหารจานเดียว'],
  [/ขนาด\s+กลาง/g, 'ขนาดกลาง'],
  [/ขนาด\s+ย่อม/g, 'ขนาดย่อม'],
  [/ใน\s+ปัจจุบัน/g, 'ในปัจจุบัน'],
  [/ที่\s+ยั่งยืน/g, 'ที่ยั่งยืน'],
  [/ของ\s*ระบบ\s+นิเวศ/g, 'ของระบบนิเวศ'],
  [/ระบบ\s+นิเวศ/g, 'ระบบนิเวศ'],
  [/ของ\s+ระบบนิเวศ/g, 'ของระบบนิเวศ'],
  [/ของ\s+ประชากร/g, 'ของประชากร'],
  [/การ\s+พัฒนา/g, 'การพัฒนา'],
  [/การ\s+อนุรักษ์/g, 'การอนุรักษ์'],
  [/การ\s+ทุจริต/g, 'การทุจริต'],
  [/การ\s+ออมเงิน/g, 'การออมเงิน'],
  [/การ\s+คลัง/g, 'การคลัง'],
  [/การ\s+ปฏิบัติงาน/g, 'การปฏิบัติงาน'],
  [/การ\s+ท่องเที่ยว/g, 'การท่องเที่ยว'],
  [/การ\s+ดำเนินงาน/g, 'การดำเนินงาน'],
  [/การ\s+ดำเนินการ/g, 'การดำเนินการ'],
  [/ความหมายของ\s+/g, 'ความหมายของ'],
  [/([ก-๙])และ\s+([ก-๙])/g, '$1และ$2'],
  [/\s+และการ/g, 'และการ'],
  [/\s+และทรัพยากร/g, 'และทรัพยากร'],
  [/\s+ของระบบนิเวศ/g, 'ของระบบนิเวศ'],
  [/การเปลี่ยนแปลง\s+ประชากร/g, 'การเปลี่ยนแปลงประชากร'],
  [/ความสัมพันธ์\s*ระหว่าง\s*ประชากร\s*กับ\s*สิ่งแวดล้อม/g, 'ความสัมพันธ์ระหว่างประชากรกับสิ่งแวดล้อม'],
  [/การพัฒนา\s+คุณภาพ/g, 'การพัฒนาคุณภาพ'],
  [/แก้\s+ปัญหา/g, 'แก้ปัญหา'],
  [/แก้\s+ไข/g, 'แก้ไข'],
  [/เติบ\s+โต/g, 'เติบโต'],
  [/ทำความ\s+คุ้นเคย/g, 'ทำความคุ้นเคย'],
  [/ระบบ\s+ต่อมไร้ท่อ/g, 'ระบบต่อมไร้ท่อ'],
  [/([ก-๙])\s+ๆ/g, '$1ๆ']
];

function cleanThaiText(str) {
  if (!str) return '';
  let s = String(str).replace(/[\uF700-\uF71A]/g, ch => PUA_THAI_MAP[ch] || '');
  s = s.replace(/\u0E4D\u0E32/g, '\u0E33');
  for (const [re, rep] of BROKEN_THAI_WORDS) {
    s = s.replace(re, rep);
  }
  return s;
}

// Keep a trailing course/unit number glued to the preceding word with a non-breaking space so a lone digit never wraps onto its own line
function keepTrailingNumberTogether(str) {
  return cleanThaiText(str).replace(/([ก-๙A-Za-z])\s*(\d+)(\)?)$/, '$1\u00A0$2$3');
}

function getSubjectStdLetter(course) {
  const area = (course && course.learning_area) || '';
  if (area.includes('ภาษาต่างประเทศ')) return 'ต';
  const m = ((course && course.course_code) || '').match(/^[ก-ฮ]/);
  if (m && 'ทควสพศงต'.includes(m[0])) return m[0];
  return 'ต';
}

// "ง1.1" / "พ.3.1" / "ง 1 .1" -> "ง 1.1"
function normStdCode(s) {
  return String(s || '').replace(/([ทควสพศงต])\s*\.?\s*(\d+)\s*\.\s*(\d+)/g, '$1 $2.$3').trim();
}

function normalizeRawBasicText(raw, subjLetter = 'ท') {
  let s = cleanThaiText(raw).replace(/[–—]/g, '-');
  s = s.replace(/ตัวชี้ว(?:ัด|ตัด)(?:ระหว่างทาง|ปลายทาง)?/g, '\n');
  s = s.replace(/([ก-๙\-])([ทควสพศงต]\s*\.?\s*\d+\s*\.\s*\d+\s*(?:ม|ป))/g, '$1 $2');
  s = s.replace(/([ทควสพศงต])\s*\.\s*(\d+\s*\.\s*\d+)/g, '$1 $2');
  s = s.replace(/(?<![ทควสพศงต]\s*)(\b\d+\s*\.\s*\d+\s*(?:ม|ป)\s*\.?\s*\d)/g, `${subjLetter} $1`);
  s = s.replace(/(ม|ป)\s*\.?\s*46(\/\d+)/g, '$1.4-6$2');
  return s;
}

function stripLeadingNumbers(text) {
  let t = cleanThaiText(text).trim();
  while (LEADING_NUM_RE.test(t)) t = t.replace(LEADING_NUM_RE, '').trim();
  return cleanThaiText(t);
}

function extractExplicitOutcomeNums(rawList) {
  const nums = [];
  (rawList || []).forEach(raw => {
    const s = String(raw || '').replace(/[–—]/g, '-').trim();
    if (/^(?:(?:ผลการเรียนรู้\s*)?(?:ข้อ(?:ที่)?|ที่)?\s*\d+(?:\s*[\-\,]\s*\d+)*[\s,]*)+$/.test(s)) {
      s.replace(/ผลการเรียนรู้|ข้อ(?:ที่)?|ที่/g, ',').split(',').forEach(part => {
        const m = part.trim().match(/^(\d+)\s*-\s*(\d+)$/);
        if (m) {
          for (let k = +m[1]; k <= +m[2]; k++) nums.push(k);
        } else if (/^\d+$/.test(part.trim())) {
          nums.push(+part.trim());
        }
      });
    }
  });
  return [...new Set(nums)].sort((a, b) => a - b);
}

// Elective outcomes: split strings that contain several numbered items ("3. ... 4. ...")
// and strip duplicated numbering ("2. 2. ...", "ผลการเรียนรู้ข้อที่1 ...") -> clean list without numbers
function splitElectiveOutcomes(indicators) {
  const out = [];
  const seen = new Set();
  (indicators || []).forEach(raw => {
    if (!raw) return;
    const s = cleanThaiText(raw).replace(/\s+/g, ' ').trim();
    if (NOISE_OUTCOME_RE.test(s)) return;
    s.split(/\s+(?=(?:ผลการเรียนรู้\s*(?:ข้อ(?:ที่)?|ที่)?\s*\d+|(?:ข้อที่\s*)?\d{1,2}(?:\.\d{1,2})*\s*[\.\)]\s*[ก-๙A-Za-z]))/).forEach(part => {
      if (NOISE_OUTCOME_RE.test(part.trim())) return;
      const t = stripLeadingNumbers(part);
      if (!t || NOISE_OUTCOME_RE.test(t)) return;
      const key = t.replace(/\s+/g, '');
      if (!seen.has(key)) {
        seen.add(key);
        out.push(t);
      }
    });
  });
  if (out.length === 0) {
    const exp = extractExplicitOutcomeNums(indicators);
    if (exp.length > 0) {
      const maxN = Math.max(...exp);
      for (let i = 1; i <= maxN; i++) out.push(`ผลการเรียนรู้ข้อที่ ${i}`);
    }
  }
  return out;
}

// Backward-compatible single-item formatter
function cleanLearningOutcome(text, index) {
  return `${index + 1}. ${stripLeadingNumbers(text)}`;
}

// Clean one basic-course indicator chunk
function cleanBasicIndicator(text, fallbackStd) {
  if (!text) return "";
  let s = text.replace(/^[\-\s]+/, '').trim();
  const mSplit = s.match(/^([ทควสพศงต]\s*\d+\s*\.\s*\d+).*?ตัวชี้ว(?:ัด|ตัด)(?:ระหว่างทาง|ปลายทาง)?\s*((?:ม\.?|ป\.?)\s*[\d\-\/]+\s*.*)$/);
  if (mSplit) {
    s = `${normStdCode(mSplit[1])} ${mSplit[2].trim()}`;
  } else {
    s = s.replace(/^ตัวชี้ว(?:ัด|ตัด)(?:ระหว่างทาง|ปลายทาง)?\s*/, '').trim();
    if (fallbackStd && /^(?:ม\.?|ป\.?)\s*\d/.test(s)) s = `${fallbackStd} ${s}`;
  }
  return normStdCode(s)
    .replace(/([ทควสพศงต] \d+\.\d+)\s*(?=(?:ม|ป))/g, '$1 ')
    .replace(/(^|\s)(ม|ป)\s*\.?\s*(\d+(?:\s*-\s*\d+)?\s*\/)/g, '$1$2.$3')   // "ม 1/1" / "ม. 2/3" -> "ม.1/1"
    .replace(/(\/\d+(?:-\d+)?)(?=[ก-๙])/g, '$1 ')                           // "ม.4/2สร้าง" -> "ม.4/2 สร้าง"
    .replace(/\s+/g, ' ')
    .trim();
}

function compareStdCodes(a, b) {
  const pa = a.match(/^([ก-ฮ]) (\d+)\.(\d+)/), pb = b.match(/^([ก-ฮ]) (\d+)\.(\d+)/);
  if (!pa || !pb) return a.localeCompare(b, 'th');
  if (pa[1] !== pb[1]) return pa[1].localeCompare(pb[1], 'th');
  return (+pa[2] - +pb[2]) || (+pa[3] - +pb[3]);
}

// Unique standards [{ code, desc }] for a basic course, sorted by code
function getCourseStandards(course) {
  if (!course) return [];
  const subjLetter = getSubjectStdLetter(course);
  const stdMap = {};
  const add = (code, fallbackDesc) => {
    if (!code) return;
    const desc = CURRICULUM_STANDARDS[code] || fallbackDesc || "";
    if (!desc) return;
    if (!(code in stdMap)) stdMap[code] = desc;
  };
  (course.standards || []).forEach(std => {
    const norm = normalizeRawBasicText(std, subjLetter);
    const m = norm.match(/([ทควสพศงต])\s*(\d+)\s*\.\s*(\d+)/);
    if (m) {
      const code = `${m[1]} ${m[2]}.${m[3]}`;
      add(code, norm.replace(/^มาตรฐาน\s*/, '').replace(/[ทควสพศงต]\s*\d+\s*\.\s*\d+/, '').trim());
    }
  });
  (course.indicators || []).forEach(ind => {
    const norm = normalizeRawBasicText(ind, subjLetter);
    (norm.match(/[ทควสพศงต]\s*\d+\s*\.\s*\d+/g) || []).forEach(m => add(normStdCode(m)));
  });
  return Object.keys(stdMap).sort(compareStdCodes).map(code => ({ code, desc: stdMap[code] }));
}

// Cleaned indicator list for a basic course
function getCourseCleanBasicIndicators(course) {
  if (!course || !course.indicators) return [];
  const subjLetter = getSubjectStdLetter(course);
  const result = [];
  const seenKey = new Set();
  let currentStd = null;
  course.indicators.forEach(ind => {
    if (!ind) return;
    const norm = normalizeRawBasicText(ind, subjLetter);
    norm.split(/\n+/).forEach(chunk => {
      const trimmed = chunk.trim();
      if (!trimmed) return;
      const mStd = trimmed.match(/([ทควสพศงต])\s*(\d+)\s*\.\s*(\d+)/);
      if (mStd) currentStd = `${mStd[1]} ${mStd[2]}.${mStd[3]}`;
      const hasKpiCode = /(?:ม|ป)\s*\.?\s*\d+(?:\s*-\s*\d+)?\s*\//.test(trimmed);
      // A chunk that starts with a standard code but carries no indicator code is the
      // standard's own description (already printed under "มาตรฐาน") -> skip it
      if (!hasKpiCode && /^[ทควสพศงต]\s*\d+\s*\.\s*\d+/.test(trimmed)) return;

      let body = trimmed;
      const mDescThenKpi = body.match(/^([ทควสพศงต]\s*\d+\s*\.\s*\d+)\s+(?!(?:ม|ป)\s*\.?\s*\d).*?((?:[ทควสพศงต]\s*\d+\s*\.\s*\d+\s*)?(?:ม|ป)\s*\.?\s*\d+(?:\s*-\s*\d+)?\s*\/\s*\d+[\s\S]*)$/);
      if (mDescThenKpi) {
        currentStd = normStdCode(mDescThenKpi[1]);
        body = mDescThenKpi[2].trim();
      }

      const parts = body.split(/[\s\-]+(?=[ทควสพศงต]\s*\d+\s*\.\s*\d+\s*(?:ม|ป)\s*\.?\s*\d)|(?<=[ก-๙]{2})\s+(?=(?:ม|ป)\s*\.?\s*\d+(?:\s*-\s*\d+)?\s*\/\s*\d)/);
      parts.forEach(part => {
        const pTrim = part.trim();
        if (!pTrim) return;
        const mPartStd = pTrim.match(/^([ทควสพศงต])\s*(\d+)\s*\.\s*(\d+)/);
        if (mPartStd) currentStd = `${mPartStd[1]} ${mPartStd[2]}.${mPartStd[3]}`;
        const item = cleanBasicIndicator(pTrim, currentStd);
        if (!item) return;
        const normKey = item.replace(/[\s\/]+/g, '');
        if (!seenKey.has(normKey)) {
          seenKey.add(normKey);
          result.push(item);
        }
      });
    });
  });
  return result;
}

// ---------- Elective: unit -> learning outcome mapping ----------
// Default: spread outcomes over units in order; every unit gets at least one outcome
function getDefaultOutcomeMapping(numOutcomes, numUnits) {
  const map = Array.from({ length: numUnits }, () => []);
  if (numOutcomes <= 0 || numUnits <= 0) return map;
  for (let k = 0; k < numOutcomes; k++) {
    map[Math.min(numUnits - 1, Math.floor(k * numUnits / numOutcomes))].push(k + 1);
  }
  map.forEach((nos, i) => {
    if (nos.length === 0) nos.push(Math.min(numOutcomes, Math.floor(i * numOutcomes / numUnits) + 1));
  });
  return map;
}

function getUnitOutcomeNos(course, uIdx) {
  if (!course || !course.units || !course.units[uIdx]) return [];
  const u = course.units[uIdx];
  const courseOuts = splitElectiveOutcomes(course.indicators);
  const N = courseOuts.length;
  if (Array.isArray(u.outcome_nos) && u.outcome_nos.length > 0) {
    return [...new Set(u.outcome_nos)].filter(n => n >= 1 && (N === 0 || n <= N)).sort((a, b) => a - b);
  }
  // Match unit's own indicators against course outcomes
  if (Array.isArray(u.indicators) && u.indicators.length > 0) {
    const keyToIdx = new Map();
    courseOuts.forEach((t, i) => keyToIdx.set(t.replace(/\s+/g, ''), i + 1));
    const unitOuts = splitElectiveOutcomes(u.indicators);
    const mapped = [...new Set(unitOuts.map(t => keyToIdx.get(t.replace(/\s+/g, ''))).filter(Boolean))].sort((a, b) => a - b);
    if (mapped.length > 0) return mapped;
    const exp = extractExplicitOutcomeNums(u.indicators).filter(n => n >= 1 && (N === 0 || n <= N));
    if (exp.length > 0) return exp;
  }
  return getDefaultOutcomeMapping(N, course.units.length)[uIdx] || [];
}

// [1,2,3,5] -> "1-3, 5"
function compressNumbers(nums) {
  const s = [...new Set(nums)].sort((a, b) => a - b);
  const parts = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    parts.push(i === j ? `${s[i]}` : `${s[i]}-${s[j]}`);
    i = j;
  }
  return parts.join(', ');
}

function ensureCourseUnits(course) {
  if (!course) return;
  if (!Array.isArray(course.units) || course.units.length === 0) {
    const h = course.total_hours || 40;
    const h1 = Math.floor(h / 2);
    const h2 = h - h1;
    course.units = [
      {
        unit_no: "1",
        unit_name: `หน่วยการเรียนรู้ที่ 1 (${course.course_name || 'ส่วนที่ 1'})`,
        hours: h1,
        indicators: (course.indicators || []).slice(0, Math.ceil((course.indicators || []).length / 2)),
        evaluation_methods: "- กิจกรรม/ใบงาน\n- แบบทดสอบย่อย\n- การสังเกตพฤติกรรม",
        score_k: 20, score_p: 10, score_a: 5, score_total: 35
      },
      {
        unit_no: "2",
        unit_name: `หน่วยการเรียนรู้ที่ 2 (${course.course_name || 'ส่วนที่ 2'})`,
        hours: h2,
        indicators: (course.indicators || []).slice(Math.ceil((course.indicators || []).length / 2)),
        evaluation_methods: "- กิจกรรม/ใบงาน\n- แบบทดสอบย่อย\n- การสังเกตพฤติกรรม",
        score_k: 20, score_p: 10, score_a: 5, score_total: 35
      }
    ];
  }
}

// Expose to window for UI usage
if (typeof window !== 'undefined') {
  Object.assign(window, {
    CURRICULUM_STANDARDS, normStdCode, splitElectiveOutcomes, cleanLearningOutcome,
    cleanBasicIndicator, getCourseStandards, getCourseCleanBasicIndicators,
    getDefaultOutcomeMapping, getUnitOutcomeNos, compressNumbers, ensureCourseUnits
  });
}
function getOptimalCutoff(units, targetPreHours) {
  if (!units || units.length <= 1) return 1;
  const N = units.length;
  let bestCutoff = 1;
  let minDiff = Infinity;
  const totalSum = units.reduce((s, u) => s + (u.hours || 0), 0);
  const target = (targetPreHours && targetPreHours > 0) ? targetPreHours : Math.round(totalSum / 2);
  let accHours = 0;
  for (let k = 1; k < N; k++) {
    accHours += (units[k - 1].hours || 0);
    const diff = Math.abs(accHours - target);
    if (diff < minDiff) {
      minDiff = diff;
      bestCutoff = k;
    } else if (diff === minDiff) {
      const half = N / 2;
      if (Math.abs(k - half) < Math.abs(bestCutoff - half)) {
        bestCutoff = k;
      }
    }
  }
  return bestCutoff;
}

function formatKpiTokenNonBreaking(codeStr) {
  return String(codeStr || '')
    .replace(/([ทควสพศงต])\s+(\d+\.\d+)/g, '$1\u00A0$2')
    .replace(/(\d+)-(\d+)/g, '$1\u2011$2');
}

function compressKpiCodes(codes) {
  if (!codes || codes.length === 0) return '';
  if (codes.length === 1) return formatKpiTokenNonBreaking(codes[0]);
  const groups = {};
  codes.forEach(c => {
    const trimmed = c.trim().replace(/\s+/g, ' ');
    const m = trimmed.match(/^(.*?\/)(\d+)$/);
    if (m) {
      const prefix = m[1];
      const num = parseInt(m[2], 10);
      if (!groups[prefix]) groups[prefix] = [];
      if (!groups[prefix].includes(num)) groups[prefix].push(num);
    } else {
      if (!groups[trimmed]) groups[trimmed] = [];
    }
  });

  const parts = [];
  Object.keys(groups).forEach(key => {
    const nums = groups[key];
    if (!nums || nums.length === 0) {
      parts.push(formatKpiTokenNonBreaking(key));
      return;
    }
    nums.sort((a, b) => a - b);
    const ranges = [];
    let start = nums[0];
    let prev = nums[0];
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] === prev + 1) {
        prev = nums[i];
      } else {
        ranges.push(start === prev ? `${start}` : `${start}\u2011${prev}`);
        start = nums[i];
        prev = nums[i];
      }
    }
    ranges.push(start === prev ? `${start}` : `${start}\u2011${prev}`);
    ranges.forEach(r => parts.push(formatKpiTokenNonBreaking(`${key}${r}`)));
  });

  return parts.join(', ');
}

function extractKpiCodesFromList(inds, subjLetter = 'ท') {
  const foundCodes = [];
  let curStd = null;
  (inds || []).forEach(indStr => {
    if (!indStr) return;
    const norm = normalizeRawBasicText(indStr, subjLetter);
    const tokenRe = /([ทควสพศงต]\s*\d+\s*\.\s*\d+)|((?:ม|ป)\s*\.?\s*\d+(?:\s*-\s*\d+)?\s*\/\s*\d+(?:\s*-\s*\d+)?)/g;
    let m;
    while ((m = tokenRe.exec(norm)) !== null) {
      if (m[1]) {
        curStd = normStdCode(m[1]);
      } else if (m[2] && curStd) {
        const kpi = m[2].replace(/^(ม|ป)\s*\.?\s*/, '$1.').replace(/\s+/g, '');
        const full = `${curStd} ${kpi}`;
        if (!foundCodes.includes(full)) foundCodes.push(full);
      }
    }
  });
  return foundCodes;
}

function getUnitKpiCode(unit, fallbackIndex, course) {
  if (!unit) return `ข้อที่\u00A0${fallbackIndex || 1}`;
  const subjLetter = getSubjectStdLetter(course);
  const foundCodes = extractKpiCodesFromList(unit.indicators || [], subjLetter);
  if (foundCodes.length > 0) {
    const compressed = compressKpiCodes(foundCodes);
    return compressed
      .split(', ')
      .map(tok => (tok.length > 11 ? tok.replace(/\s+((?:ม|ป)\.)/, '\n$1') : tok))
      .join('\n');
  }
  return `ข้อที่\u00A0${unit.unit_no || fallbackIndex || 1}`;
}

function getUnitsAllKpiCodes(units, course) {
  if (!units || units.length === 0) return '';
  const subjLetter = getSubjectStdLetter(course);
  const allCodes = [];
  units.forEach(u => {
    extractKpiCodesFromList(u.indicators || [], subjLetter).forEach(code => {
      if (!allCodes.includes(code)) allCodes.push(code);
    });
  });
  if (allCodes.length > 0) {
    return compressKpiCodes(allCodes);
  }
  return '';
}

function formatExamDurationHour(mins) {
  mins = parseInt(mins, 10) || 60;
  if (mins === 60) return "1\u00A0ชั่วโมง";
  if (mins === 120) return "2\u00A0ชั่วโมง";
  if (mins === 90) return "1.5\u00A0ชั่วโมง";
  return `${mins}\u00A0นาที`;
}

async function generateAndDownloadDocx() {
  const c = currentCourse;
  if (!c) {
    alert("กรุณาเลือกรายวิชาก่อนดาวน์โหลดเอกสาร");
    return;
  }
  ensureCourseUnits(c);

  // Determine Basic vs Elective (require 5-digit number after subject prefix so 4-digit ค2010 uses c.is_basic)
  const isBasic = (typeof isBasicCourse === 'function') 
    ? isBasicCourse(c) 
    : (c._userToggledBasic !== undefined ? c._userToggledBasic : (/^[ก-ฮA-Za-z]+\d\d[12]\d{2}/.test(c.course_code || '') ? /^[ก-ฮA-Za-z]+\d\d1\d{2}/.test(c.course_code) : c.is_basic === true));

  let blob;
  if (isBasic) {
    if (window.TEMPLATE_BASIC_BASE64) {
      const byteCharacters = atob(window.TEMPLATE_BASIC_BASE64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      blob = new Blob([new Uint8Array(byteNumbers)], { 
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
      });
    } else {
      const response = await fetch("templates/template_basic_single_kpi.docx");
      if (!response.ok) throw new Error("ไม่สามารถโหลดไฟล์แม่แบบวิชาพื้นฐานได้");
      blob = await response.blob();
    }
  } else {
    if (window.TEMPLATE_ELECTIVE_BASE64) {
      const byteCharacters = atob(window.TEMPLATE_ELECTIVE_BASE64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      blob = new Blob([new Uint8Array(byteNumbers)], { 
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
      });
    } else {
      const response = await fetch("templates/template_elective.docx");
      if (!response.ok) throw new Error("ไม่สามารถโหลดไฟล์แม่แบบวิชาเพิ่มเติมได้");
      blob = await response.blob();
    }
  }

  const zip = await JSZip.loadAsync(blob);
  let docXmlStr = await zip.file("word/document.xml").async("string");

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(docXmlStr, "text/xml");

  const midDuration = document.getElementById('inputMidExamDuration')?.value 
    || document.getElementById('selectMidExamDuration')?.value 
    || "60";
  const finDuration = document.getElementById('inputFinExamDuration')?.value 
    || document.getElementById('selectFinExamDuration')?.value 
    || "60";

  const rawTask1 = document.getElementById('inputTask1')?.value.trim() || `ชิ้นงานสำคัญเรื่อง${c.course_name}`;
  const task1 = keepTrailingNumberTogether(rawTask1);
  const task1Assign = document.getElementById('inputTask1Assign')?.value.trim() || "1 - 5 ธ.ค. 69 (สัปดาห์ที่ 6)";
  const task1Due = document.getElementById('inputTask1Due')?.value.trim() || "18 ธ.ค. 69 (สัปดาห์ที่ 8)";

  const rawTask2 = document.getElementById('inputTask2')?.value.trim() || "";
  const task2 = rawTask2 ? keepTrailingNumberTogether(rawTask2) : "";
  const task2Assign = document.getElementById('inputTask2Assign')?.value.trim() || "25 - 29 ม.ค. 70 (สัปดาห์ที่ 14)";
  const task2Due = document.getElementById('inputTask2Due')?.value.trim() || "12 ก.พ. 70 (สัปดาห์ที่ 16)";

  function formatScheduleCell(str) {
    return String(str || '')
      .trim()
      .replace(/\s*\(\s*สัปดาห์ที่\s*(\d+)\s*\)/g, '\n(สัปดาห์ที่\u00A0$1)');
  }
  
  let keyTaskText = task1;
  if (task2) keyTaskText = `1)\u00A0${task1}  2)\u00A0${task2}`;

  const validTeachers = (c.teachers || []).map(t => String(t || '').trim()).filter(t => t && !t.includes('...'));
  const tStr = validTeachers.length === 0
    ? "....................................................."
    : validTeachers.length === 1
      ? validTeachers[0]
      : validTeachers.length === 2
        ? `${validTeachers[0]} และ${validTeachers[1]}`
        : `${validTeachers.slice(0, -1).join(' ')} และ${validTeachers[validTeachers.length - 1]}`;
  const h80 = Math.floor(c.total_hours * 0.8);
  const m80 = c.total_hours - h80;
  const h60 = Math.floor(c.total_hours * 0.6);
  const m60 = c.total_hours - h60;

  const cutoff = c.midterm_cutoff || (typeof getOptimalCutoff === 'function' ? getOptimalCutoff(c.units, c.target_pre_hours) : Math.max(1, Math.floor(c.units.length / 2)));
  const preUnits = c.units.slice(0, cutoff);
  const postUnits = c.units.slice(cutoff);

  function calcSub(units) {
    let k = 0, p = 0, a = 0;
    units.forEach(u => {
      if (u.assessments && Array.isArray(u.assessments) && u.assessments.length > 0) {
        u.assessments.forEach(ass => {
          k += (parseInt(ass.score_k, 10) || 0);
          p += (parseInt(ass.score_p, 10) || 0);
          a += (parseInt(ass.score_a, 10) || 0);
        });
      } else {
        k += (parseInt(u.score_k, 10) || 0);
        p += (parseInt(u.score_p, 10) || 0);
        a += (parseInt(u.score_a, 10) || 0);
      }
    });
    return { k, p, a, tot: k + p + a };
  }

  const subPre = typeof calculateSubtotal === 'function' ? calculateSubtotal(preUnits) : calcSub(preUnits);
  const subPost = typeof calculateSubtotal === 'function' ? calculateSubtotal(postUnits) : calcSub(postUnits);

  // Same per-row exam score used both for the printed rows and the totals
  function examScoreFor(type, idx, count) {
    const arr = type === 'mid' ? (c.midExamScores || []) : (c.finExamScores || []);
    if (arr[idx] !== undefined) return parseInt(arr[idx], 10) || 0;
    if (count <= 0) return 0;
    const per = Math.floor(15 / count);
    return per + (idx < 15 - per * count ? 1 : 0);
  }
  const midTot = preUnits.reduce((s, _, i) => s + examScoreFor('mid', i, preUnits.length), 0);
  const finTot = postUnits.reduce((s, _, i) => s + examScoreFor('fin', i, postUnits.length), 0);

  const grand = {
    k: subPre.k + midTot + subPost.k + finTot,
    p: subPre.p + subPost.p,
    a: subPre.a + subPost.a,
    tot: subPre.tot + midTot + subPost.tot + finTot
  };

  const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

  function escapeXml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // Consistent 16pt (sz=32) TH SarabunPSK run builder.
  // Use w:hint="cs", <w:cs/>, and w:eastAsia="en-US" w:bidi="th-TH" so Word uses Thai dictionary word-breaking instead of CJK character-splitting.
  const RUN_FONTS = '<w:rFonts w:ascii="TH SarabunPSK" w:hAnsi="TH SarabunPSK" w:cs="TH SarabunPSK" w:hint="cs"/>';
  const RUN_LANG = '<w:lang w:val="en-US" w:eastAsia="en-US" w:bidi="th-TH"/>';
  function runPropsXml(bold, sz, colorHex = null, underline = false) {
    const colorXml = colorHex ? `<w:color w:val="${colorHex}"/>` : '';
    const uXml = underline ? '<w:u w:val="single"/>' : '';
    return `<w:rPr>${RUN_FONTS}${bold ? '<w:b/><w:bCs/>' : ''}${colorXml}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>${uXml}<w:cs/>${RUN_LANG}</w:rPr>`;
  }

  function createRun(text, bold = false, sz = 32, colorHex = null, underline = false) {
    const xml = `<w:r xmlns:w="${W_NS}">${runPropsXml(bold, sz, colorHex, underline)}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
    const parsed = parser.parseFromString(xml, "text/xml");
    return xmlDoc.importNode(parsed.documentElement, true);
  }

  function createBr() {
    const xml = `<w:br xmlns:w="${W_NS}"/>`;
    const parsed = parser.parseFromString(xml, "text/xml");
    return xmlDoc.importNode(parsed.documentElement, true);
  }

  function createP() {
    const xml = `<w:p xmlns:w="${W_NS}"/>`;
    const parsed = parser.parseFromString(xml, "text/xml");
    return xmlDoc.importNode(parsed.documentElement, true);
  }

  function createTab(sz = 32) {
    const xml = `<w:r xmlns:w="${W_NS}">${runPropsXml(false, sz)}<w:tab/></w:r>`;
    const parsed = parser.parseFromString(xml, "text/xml");
    return xmlDoc.importNode(parsed.documentElement, true);
  }

  // Build <w:pPr> with correct OOXML element order: keepNext, tabs, spacing, ind, jc
  function setParagraphFormat(p, opts = {}) {
    if (!p) return;
    const oldPPr = p.getElementsByTagName("w:pPr")[0];
    if (oldPPr) p.removeChild(oldPPr);

    const keepNextXml = opts.keepNext ? '<w:keepNext/>' : '';
    let tabsXml = '';
    if (Array.isArray(opts.tabs) && opts.tabs.length > 0) {
      tabsXml = '<w:tabs>' + opts.tabs.map(t => `<w:tab w:val="${t.val || 'left'}" w:pos="${t.pos}"/>`).join('') + '</w:tabs>';
    }
    const before = opts.before !== undefined ? opts.before : 0;
    const after = opts.after !== undefined ? opts.after : 0;
    const line = opts.line !== undefined ? opts.line : 240;
    const spacingXml = `<w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/>`;

    const left = opts.left !== undefined ? ` w:left="${opts.left}"` : ' w:left="0"';
    const right = opts.right !== undefined ? ` w:right="${opts.right}"` : ' w:right="0"';
    const hangOrFirst = opts.hanging !== undefined
      ? ` w:hanging="${opts.hanging}"`
      : ` w:firstLine="${opts.firstLine !== undefined ? opts.firstLine : 0}"`;
    const indXml = `<w:ind${left}${right}${hangOrFirst}/>`;
    const jcXml = `<w:jc w:val="${opts.jc || 'left'}"/>`;

    const pPrNode = xmlDoc.importNode(
      parser.parseFromString(`<w:pPr xmlns:w="${W_NS}">${keepNextXml}${tabsXml}${spacingXml}${indXml}${jcXml}</w:pPr>`, "text/xml").documentElement,
      true
    );
    p.insertBefore(pPrNode, p.firstChild);
  }

  // Section 1 paragraph: label column + hanging indent so wrapped lines stay aligned
  // under the text column instead of falling back to the left margin.
  const SEC1_TEXT_POS = 1701;   // 3 cm
  const SEC1_LABEL_POS = 720;   // 1.27 cm (indent of "ตัวชี้วัด")
  function createSec1P(withLabelTab) {
    const p = createP();
    const tabs = [];
    if (withLabelTab) tabs.push({ val: 'left', pos: SEC1_LABEL_POS });
    tabs.push({ val: 'left', pos: SEC1_TEXT_POS });
    setParagraphFormat(p, { tabs, before: 0, after: 0, left: SEC1_TEXT_POS, hanging: SEC1_TEXT_POS, jc: 'left' });
    return p;
  }

  // Elective outcome label for a unit, e.g. "ข้อที่ 1‑2"
  function outcomeLabel(u) {
    const nos = getUnitOutcomeNos(c, c.units.indexOf(u));
    return nos.length ? `ข้อที่\u00A0${compressNumbers(nos).replace(/-/g, '\u2011')}` : "-";
  }

  function formatKeyTaskBullet(t) {
    const cleaned = keepTrailingNumberTogether(t);
    const shortLabel = cleaned.replace(/^ชิ้นงานสำคัญ\s*/, '').trim() || cleaned;
    return `ชิ้นงานสำคัญ\n(${shortLabel})`;
  }

  // Helper to set cell text cleanly while preserving/setting alignment
  function setXmlCell(cell, text, bold = false, sz = 32, align = null) {
    if (!cell) return;
    const vMerges = Array.from(cell.getElementsByTagName("w:vMerge"));
    vMerges.forEach(v => v.parentNode && v.parentNode.removeChild(v));

    let detectedAlign = align;
    const existingPs = Array.from(cell.getElementsByTagName("w:p"));
    if (!detectedAlign && existingPs.length > 0) {
      const oldJc = existingPs[0].getElementsByTagName("w:jc")[0];
      if (oldJc) detectedAlign = oldJc.getAttribute("w:val") || oldJc.getAttribute("val");
    }
    existingPs.forEach(p => cell.removeChild(p));

    const p = createP();
    setParagraphFormat(p, {
      before: 20,
      after: 20,
      line: 240,
      left: 0,
      right: 0,
      firstLine: 0,
      jc: detectedAlign || 'left'
    });
    cell.appendChild(p);

    const lines = String(text ?? '').split("\n");
    lines.forEach((line, lIdx) => {
      p.appendChild(createRun(line, bold, sz));
      if (lIdx < lines.length - 1) {
        p.appendChild(createBr());
      }
    });
  }

  // Prevent table row from splitting mid-row across a page break, and optionally glue to next row
  function ensureRowCantSplit(tr, keepWithNext = false) {
    if (!tr) return;
    let trPr = tr.getElementsByTagName("w:trPr")[0];
    if (!trPr) {
      trPr = xmlDoc.createElementNS(W_NS, "w:trPr");
      tr.insertBefore(trPr, tr.firstChild);
    }
    if (trPr.getElementsByTagName("w:cantSplit").length === 0) {
      const cs = xmlDoc.createElementNS(W_NS, "w:cantSplit");
      trPr.insertBefore(cs, trPr.firstChild);
    }
    if (keepWithNext) {
      Array.from(tr.getElementsByTagName("w:p")).forEach(p => {
        let pPr = p.getElementsByTagName("w:pPr")[0];
        if (!pPr) {
          pPr = xmlDoc.createElementNS(W_NS, "w:pPr");
          p.insertBefore(pPr, p.firstChild);
        }
        if (pPr.getElementsByTagName("w:keepNext").length === 0) {
          const kn = xmlDoc.createElementNS(W_NS, "w:keepNext");
          pPr.insertBefore(kn, pPr.firstChild);
        }
      });
    }
  }

  // Center table inline (removes floating <w:tblpPr> and asymmetric <w:tblInd>)
  function normalizeTableProps(tbl) {
    if (!tbl) return;
    const tblPr = tbl.getElementsByTagName("w:tblPr")[0];
    if (!tblPr) return;
    Array.from(tblPr.getElementsByTagName("w:tblpPr")).forEach(n => tblPr.removeChild(n));
    Array.from(tblPr.getElementsByTagName("w:tblInd")).forEach(n => tblPr.removeChild(n));
    if (tblPr.getElementsByTagName("w:jc").length === 0) {
      const jcNode = xmlDoc.importNode(
        parser.parseFromString(`<w:jc xmlns:w="${W_NS}" w:val="center"/>`, "text/xml").documentElement,
        true
      );
      const tblW = tblPr.getElementsByTagName("w:tblW")[0];
      tblPr.insertBefore(jcNode, tblW ? tblW.nextSibling : null);
    }
  }

  // Set paragraph text cleanly while preserving or applying paragraph formatting (<w:pPr>)
  function setXmlParagraphText(p, text, bold = false, sz = 32, formatOpts = null, colorHex = null) {
    if (!p) return;
    const pPr = p.getElementsByTagName("w:pPr")[0];
    while (p.firstChild) {
      p.removeChild(p.firstChild);
    }
    if (pPr) {
      p.appendChild(pPr);
    }
    if (formatOpts) {
      setParagraphFormat(p, formatOpts);
    }

    const lines = String(text ?? '').split("\n");
    lines.forEach((line, lIdx) => {
      const parts = line.split("\t");
      parts.forEach((part, idx) => {
        if (part) {
          p.appendChild(createRun(part, bold, sz, colorHex));
        }
        if (idx < parts.length - 1) {
          p.appendChild(createTab(sz));
        }
      });
      if (lIdx < lines.length - 1) {
        p.appendChild(createBr());
      }
    });
  }

  // Symmetrize page margins (1.5 cm left & right -> 10206 twips printable width)
  const PAGE_TEXT_WIDTH = 10206;
  const sectPr = xmlDoc.getElementsByTagName("w:sectPr")[0];
  if (sectPr) {
    const pgMar = sectPr.getElementsByTagName("w:pgMar")[0];
    if (pgMar) {
      pgMar.setAttribute("w:left", "850");
      pgMar.setAttribute("w:right", "850");
      pgMar.setAttribute("w:top", "1020");
      pgMar.setAttribute("w:bottom", "1020");
    }
  }

  // Upgrade existing template runs (in Table 0 headers, Table 1, and notes) so Word uses Thai CS word-breaking instead of CJK char-splitting
  function upgradeRunPropsInTree(rootNode) {
    if (!rootNode) return;
    const runs = Array.from(rootNode.getElementsByTagName("w:r"));
    runs.forEach(r => {
      const existingRPr = r.getElementsByTagName("w:rPr")[0];
      const isBold = existingRPr ? existingRPr.getElementsByTagName("w:b").length > 0 : true;
      const isUnderline = existingRPr ? existingRPr.getElementsByTagName("w:u").length > 0 : false;
      const szNode = existingRPr
        ? (existingRPr.getElementsByTagName("w:sz")[0] || existingRPr.getElementsByTagName("w:szCs")[0])
        : null;
      const sz = szNode ? (parseInt(szNode.getAttribute("w:val") || "32", 10) || 32) : 32;
      const newR = xmlDoc.importNode(
        parser.parseFromString(`<w:r xmlns:w="${W_NS}">${runPropsXml(isBold, sz, null, isUnderline)}</w:r>`, "text/xml").documentElement,
        true
      );
      const newRPr = newR.firstChild;
      if (existingRPr) {
        r.replaceChild(newRPr, existingRPr);
      } else {
        r.insertBefore(newRPr, r.firstChild);
      }
    });
  }

  // 1. Dynamic Reconstruction of Table 0 (Matrix Table)
  const tables = xmlDoc.getElementsByTagName("w:tbl");
  if (tables.length > 0) {
    const t0 = tables[0];
    normalizeTableProps(t0);
    const origRows = Array.from(t0.getElementsByTagName("w:tr"));

    // Extract row prototypes according to template type
    const headerRow0 = origRows[0].cloneNode(true);
    const headerRow1 = origRows[1].cloneNode(true);
    ensureRowCantSplit(headerRow0, true);
    ensureRowCantSplit(headerRow1, true);
    const cycleProto = origRows[2].cloneNode(true); // 1 cell spanning all columns
    let dataProto, subProto, examProto;

    if (isBasic) {
      // Basic template has 10 columns
      dataProto = origRows[3].cloneNode(true); // 10 cells
      subProto  = origRows[7].cloneNode(true); // 5 cells
      examProto = origRows[9].cloneNode(true); // 10 cells
    } else {
      // Elective template has 8 columns
      dataProto = origRows[3].cloneNode(true); // 8 cells
      subProto  = origRows[6].cloneNode(true); // 5 cells
      examProto = origRows[8].cloneNode(true); // 8 cells
    }

    upgradeRunPropsInTree(headerRow0);
    upgradeRunPropsInTree(headerRow1);

    if (isBasic) {
      const trHeight = headerRow1.getElementsByTagName("w:trHeight")[0];
      if (trHeight) trHeight.setAttribute("w:val", "1560");
      const h1Cells = headerRow1.getElementsByTagName("w:tc");
      if (h1Cells.length > 4) {
        setXmlCell(h1Cells[3], "ตัวชี้วัดระหว่างทาง", true, 28, 'center');
        setXmlCell(h1Cells[4], "ตัวชี้วัดปลายทาง", true, 28, 'center');
      }
    }

    // Remove all existing rows from table 0
    origRows.forEach(r => t0.removeChild(r));

    // Append table headers
    t0.appendChild(headerRow0);
    t0.appendChild(headerRow1);

    // --- Helper to populate a data row ---
    function populateDataRow(r, u, ass, aIdx, unitIdx, isPost) {
      ensureRowCantSplit(r, false);
      const cells = r.getElementsByTagName("w:tc");
      const kpiCode = isBasic ? getUnitKpiCode(u, unitIdx + 1, c) : outcomeLabel(u);
      const cleanUnitName = keepTrailingNumberTogether(u.unit_name);
      const unitCellText = `${cleanUnitName}\n(${u.hours}\u00A0ชั่วโมง)`;

      let mText = cleanThaiText(ass.eval_methods || '- กิจกรรม/ใบงาน\n- แบบทดสอบย่อย\n- การสังเกตพฤติกรรม').trim();
      if (!isPost && unitIdx === 0 && aIdx === 0 && task1 && !mText.includes(task1)) {
        const keyBullet = formatKeyTaskBullet(task1);
        if (mText.includes("ชิ้นงานสำคัญ")) {
          mText = mText.replace(/ชิ้นงานสำคัญ/g, keyBullet);
        } else {
          mText += `\n- ${keyBullet}`;
        }
      } else if (isPost && unitIdx === postUnits.length - 1 && aIdx === (u.assessments?.length || 1) - 1 && task2 && !mText.includes(task2)) {
        const keyBullet = formatKeyTaskBullet(task2);
        if (mText.includes("ชิ้นงานสำคัญ")) {
          mText = mText.replace(/ชิ้นงานสำคัญ/g, keyBullet);
        } else {
          mText += `\n- ${keyBullet}`;
        }
      }

      if (isBasic) {
        // 10 cells: [0] No, [1] Name(hrs), [2] KPI Code, [3] mid-way, [4] end-way, [5] Method, [6] K, [7] P, [8] A, [9] Total
        if (aIdx === 0) {
          setXmlCell(cells[0], u.unit_no, false, 32, 'center');
          setXmlCell(cells[1], unitCellText, false, 32, 'left');
          setXmlCell(cells[2], kpiCode, false, 32, 'center');
        } else {
          setXmlCell(cells[0], "", false, 32, 'center');
          setXmlCell(cells[1], "", false, 32, 'left');
          setXmlCell(cells[2], "", false, 32, 'center');
        }
        setXmlCell(cells[3], "", false, 32, 'center');
        setXmlCell(cells[4], "", false, 32, 'center');
        setXmlCell(cells[5], mText, false, 32, 'left');
        setXmlCell(cells[6], ass.score_k != null && ass.score_k !== "" ? ass.score_k : "-", false, 32, 'center');
        setXmlCell(cells[7], ass.score_p != null && ass.score_p !== "" ? ass.score_p : "-", false, 32, 'center');
        setXmlCell(cells[8], ass.score_a != null && ass.score_a !== "" ? ass.score_a : "-", false, 32, 'center');
        setXmlCell(cells[9], ass.score_total, true, 32, 'center');
      } else {
        // 8 cells: [0] No, [1] Name(hrs), [2] Outcome, [3] Method, [4] K, [5] P, [6] A, [7] Total
        if (aIdx === 0) {
          setXmlCell(cells[0], u.unit_no, false, 32, 'center');
          setXmlCell(cells[1], unitCellText, false, 32, 'left');
          setXmlCell(cells[2], outcomeLabel(u), false, 32, 'center');
        } else {
          setXmlCell(cells[0], "", false, 32, 'center');
          setXmlCell(cells[1], "", false, 32, 'left');
          setXmlCell(cells[2], "", false, 32, 'center');
        }
        setXmlCell(cells[3], mText, false, 32, 'left');
        setXmlCell(cells[4], ass.score_k != null && ass.score_k !== "" ? ass.score_k : "-", false, 32, 'center');
        setXmlCell(cells[5], ass.score_p != null && ass.score_p !== "" ? ass.score_p : "-", false, 32, 'center');
        setXmlCell(cells[6], ass.score_a != null && ass.score_a !== "" ? ass.score_a : "-", false, 32, 'center');
        setXmlCell(cells[7], ass.score_total, true, 32, 'center');
      }
    }

    // --- Helper to populate an exam row ---
    function populateExamRow(r, u, idx, totalUnitsInCycle, examType) {
      ensureRowCantSplit(r, true);
      const cells = r.getElementsByTagName("w:tc");
      const isLast = (idx === totalUnitsInCycle - 1);
      const durText = formatExamDurationHour(examType === 'mid' ? midDuration : finDuration);
      const cleanUnitName = keepTrailingNumberTogether(u.unit_name);
      const uName = isLast ? `${cleanUnitName} (${durText})` : cleanUnitName;
      const kpiCode = isBasic ? getUnitKpiCode(u, idx + 1, c) : outcomeLabel(u);
      const sc = examScoreFor(examType, idx, totalUnitsInCycle);

      const methodText = examType === 'mid'
        ? "- แบบทดสอบกลางภาค\n(แบบปรนัย/อัตนัย)"
        : "- แบบทดสอบปลายภาค\n(แบบปรนัย/อัตนัย)";

      if (isBasic) {
        // 10 cells
        setXmlCell(cells[0], u.unit_no, false, 32, 'center');
        setXmlCell(cells[1], uName, false, 32, 'left');
        setXmlCell(cells[2], kpiCode, false, 32, 'center');
        setXmlCell(cells[3], "", false, 32, 'center');
        setXmlCell(cells[4], "", false, 32, 'center');
        setXmlCell(cells[5], methodText, false, 32, 'left');
        setXmlCell(cells[6], sc, false, 32, 'center');
        setXmlCell(cells[7], "-", false, 32, 'center');
        setXmlCell(cells[8], "-", false, 32, 'center');
        setXmlCell(cells[9], sc, true, 32, 'center');
      } else {
        // 8 cells
        setXmlCell(cells[0], u.unit_no, false, 32, 'center');
        setXmlCell(cells[1], uName, false, 32, 'left');
        setXmlCell(cells[2], outcomeLabel(u), false, 32, 'center');
        setXmlCell(cells[3], methodText, false, 32, 'left');
        setXmlCell(cells[4], sc, false, 32, 'center');
        setXmlCell(cells[5], "-", false, 32, 'center');
        setXmlCell(cells[6], "-", false, 32, 'center');
        setXmlCell(cells[7], sc, true, 32, 'center');
      }
    }

    // --- CYCLE 1: ก่อนสอบกลางภาค ---
    const c1Row = cycleProto.cloneNode(true);
    setXmlCell(c1Row.getElementsByTagName("w:tc")[0], "1. การวัดผลก่อนสอบกลางภาค", true, 32, 'left');
    ensureRowCantSplit(c1Row, true);
    t0.appendChild(c1Row);

    preUnits.forEach((u, idx) => {
      const assessments = (u.assessments && Array.isArray(u.assessments) && u.assessments.length > 0)
        ? u.assessments
        : [{ eval_methods: u.evaluation_methods, score_k: u.score_k, score_p: u.score_p, score_a: u.score_a, score_total: u.score_total }];

      assessments.forEach((ass, aIdx) => {
        const r = dataProto.cloneNode(true);
        populateDataRow(r, u, ass, aIdx, idx, false);
        t0.appendChild(r);
      });
    });

    // Subtotal Cycle 1 (5 cells)
    const subPreRow = subProto.cloneNode(true);
    const spCells = subPreRow.getElementsByTagName("w:tc");
    setXmlCell(spCells[0], "รวมคะแนนวัดผลก่อนสอบกลางภาค", true, 32, 'center');
    setXmlCell(spCells[1], subPre.k, true, 32, 'center');
    setXmlCell(spCells[2], subPre.p, true, 32, 'center');
    setXmlCell(spCells[3], subPre.a, true, 32, 'center');
    setXmlCell(spCells[4], subPre.tot, true, 32, 'center');
    ensureRowCantSplit(subPreRow, false);
    t0.appendChild(subPreRow);

    // --- CYCLE 2: กลางภาค ---
    const c2Row = cycleProto.cloneNode(true);
    const midDurationText = formatExamDurationHour(midDuration);
    setXmlCell(c2Row.getElementsByTagName("w:tc")[0], `2. การวัดผลกลางภาค (${midDurationText})`, true, 32, 'left');
    ensureRowCantSplit(c2Row, true);
    t0.appendChild(c2Row);

    preUnits.forEach((u, idx) => {
      const r = examProto.cloneNode(true);
      populateExamRow(r, u, idx, preUnits.length, 'mid');
      t0.appendChild(r);
    });

    // Subtotal Cycle 2 (5 cells)
    const subMidRow = subProto.cloneNode(true);
    const smCells = subMidRow.getElementsByTagName("w:tc");
    setXmlCell(smCells[0], "รวมคะแนนวัดผลกลางภาค", true, 32, 'center');
    setXmlCell(smCells[1], midTot, true, 32, 'center');
    setXmlCell(smCells[2], "-", true, 32, 'center');
    setXmlCell(smCells[3], "-", true, 32, 'center');
    setXmlCell(smCells[4], midTot, true, 32, 'center');
    ensureRowCantSplit(subMidRow, false);
    t0.appendChild(subMidRow);

    // --- CYCLE 3: หลังสอบกลางภาค ---
    if (postUnits.length > 0) {
      const c3Row = cycleProto.cloneNode(true);
      setXmlCell(c3Row.getElementsByTagName("w:tc")[0], "3. การวัดผลหลังสอบกลางภาค", true, 32, 'left');
      ensureRowCantSplit(c3Row, true);
      t0.appendChild(c3Row);

      postUnits.forEach((u, idx) => {
        const assessments = (u.assessments && Array.isArray(u.assessments) && u.assessments.length > 0)
          ? u.assessments
          : [{ eval_methods: u.evaluation_methods, score_k: u.score_k, score_p: u.score_p, score_a: u.score_a, score_total: u.score_total }];

        assessments.forEach((ass, aIdx) => {
          const r = dataProto.cloneNode(true);
          populateDataRow(r, u, ass, aIdx, idx, true);
          t0.appendChild(r);
        });
      });

      // Subtotal Cycle 3 (5 cells)
      const subPostRow = subProto.cloneNode(true);
      const spotCells = subPostRow.getElementsByTagName("w:tc");
      setXmlCell(spotCells[0], "รวมคะแนนวัดผลหลังสอบกลางภาค", true, 32, 'center');
      setXmlCell(spotCells[1], subPost.k, true, 32, 'center');
      setXmlCell(spotCells[2], subPost.p, true, 32, 'center');
      setXmlCell(spotCells[3], subPost.a, true, 32, 'center');
      setXmlCell(spotCells[4], subPost.tot, true, 32, 'center');
      ensureRowCantSplit(subPostRow, false);
      t0.appendChild(subPostRow);
    }

    // --- CYCLE 4: ปลายภาค ---
    const c4Row = cycleProto.cloneNode(true);
    const finDurationText = formatExamDurationHour(finDuration);
    setXmlCell(c4Row.getElementsByTagName("w:tc")[0], `4. การวัดผลปลายภาค (${finDurationText})`, true, 32, 'left');
    ensureRowCantSplit(c4Row, true);
    t0.appendChild(c4Row);

    postUnits.forEach((u, idx) => {
      const r = examProto.cloneNode(true);
      populateExamRow(r, u, idx, postUnits.length, 'fin');
      t0.appendChild(r);
    });

    // Subtotal Cycle 4 (5 cells)
    const subFinRow = subProto.cloneNode(true);
    const sfCells = subFinRow.getElementsByTagName("w:tc");
    setXmlCell(sfCells[0], "รวมคะแนนวัดผลปลายภาค", true, 32, 'center');
    setXmlCell(sfCells[1], finTot, true, 32, 'center');
    setXmlCell(sfCells[2], "-", true, 32, 'center');
    setXmlCell(sfCells[3], "-", true, 32, 'center');
    setXmlCell(sfCells[4], finTot, true, 32, 'center');
    ensureRowCantSplit(subFinRow, true);
    t0.appendChild(subFinRow);

    // --- GRAND TOTAL ---
    const grandRow = subProto.cloneNode(true);
    const gCells = grandRow.getElementsByTagName("w:tc");
    setXmlCell(gCells[0], "รวมคะแนนทั้งสิ้นตลอดภาคเรียน", true, 32, 'center');
    setXmlCell(gCells[1], grand.k, true, 32, 'center');
    setXmlCell(gCells[2], grand.p, true, 32, 'center');
    setXmlCell(gCells[3], grand.a, true, 32, 'center');
    setXmlCell(gCells[4], grand.tot, true, 32, 'center');
    ensureRowCantSplit(grandRow, false);
    t0.appendChild(grandRow);
  }

  // 1b. Table 1: Grading Scale Table (Section 4) -> center & keep all rows together on one page
  if (tables.length > 1) {
    const t1 = tables[1];
    normalizeTableProps(t1);
    upgradeRunPropsInTree(t1);
    const t1Rows = Array.from(t1.getElementsByTagName("w:tr"));
    t1Rows.forEach((tr, rIdx) => {
      ensureRowCantSplit(tr, rIdx < t1Rows.length - 1);
    });
  }

  // 2. Table 2: Key Assignments Table (index 2 in docx)
  if (tables.length > 2) {
    const t3 = tables[2];
    normalizeTableProps(t3);
    const t3Rows = Array.from(t3.getElementsByTagName("w:tr"));

    // Table 2 Header: explicitly format all 5 headers in bold and wrap "กำหนด\nมอบหมายงาน" cleanly
    if (t3Rows.length > 0) {
      ensureRowCantSplit(t3Rows[0], true);
      const hCells = t3Rows[0].getElementsByTagName("w:tc");
      if (hCells.length >= 5) {
        setXmlCell(hCells[0], "ที่", true, 32, 'center');
        setXmlCell(hCells[1], "ชิ้นงานสำคัญ", true, 32, 'center');
        setXmlCell(hCells[2], isBasic ? "มาตรฐาน/ตัวชี้วัด" : "ผลการเรียนรู้", true, 32, 'center');
        setXmlCell(hCells[3], "กำหนด\nมอบหมายงาน", true, 32, 'center');
        setXmlCell(hCells[4], "กำหนดส่ง", true, 32, 'center');
      } else if (hCells.length > 2) {
        setXmlCell(hCells[2], isBasic ? "มาตรฐาน/ตัวชี้วัด" : "ผลการเรียนรู้", true, 32, 'center');
      }
    }

    // Determine KPI text for tasks
    let kpiRange1 = "";
    let kpiRange2 = "";

    if (isBasic) {
      kpiRange1 = getUnitsAllKpiCodes(preUnits, c) || "ตัวชี้วัดประจำหน่วย";
      kpiRange2 = getUnitsAllKpiCodes(postUnits, c) || "ตัวชี้วัดประจำหน่วย";
    } else {
      const outcomesOf = units => units.flatMap(u => getUnitOutcomeNos(c, c.units.indexOf(u)));
      const pre = outcomesOf(preUnits), post = outcomesOf(postUnits);
      kpiRange1 = pre.length ? `ผลการเรียนรู้\nข้อที่\u00A0${compressNumbers(pre).replace(/-/g, '\u2011')}` : "-";
      kpiRange2 = post.length ? `ผลการเรียนรู้\nข้อที่\u00A0${compressNumbers(post).replace(/-/g, '\u2011')}` : "-";
    }

    if (t3Rows.length > 1) {
      ensureRowCantSplit(t3Rows[1], false);
      const r1Cells = t3Rows[1].getElementsByTagName("w:tc");
      setXmlCell(r1Cells[0], "1.1", false, 32, 'center');
      setXmlCell(r1Cells[1], task1, false, 32, 'left');
      setXmlCell(r1Cells[2], kpiRange1, false, 32, 'center');
      setXmlCell(r1Cells[3], formatScheduleCell(task1Assign), false, 32, 'center'); // กำหนดมอบหมายงาน
      setXmlCell(r1Cells[4], formatScheduleCell(task1Due), false, 32, 'center');    // กำหนดส่ง
    }
    if (t3Rows.length > 2) {
      ensureRowCantSplit(t3Rows[2], false);
      const r2Cells = t3Rows[2].getElementsByTagName("w:tc");
      if (task2) {
        setXmlCell(r2Cells[0], "1.2", false, 32, 'center');
        setXmlCell(r2Cells[1], task2, false, 32, 'left');
        setXmlCell(r2Cells[2], kpiRange2, false, 32, 'center');
        setXmlCell(r2Cells[3], formatScheduleCell(task2Assign), false, 32, 'center'); // กำหนดมอบหมายงาน
        setXmlCell(r2Cells[4], formatScheduleCell(task2Due), false, 32, 'center');    // กำหนดส่ง
      } else {
        // Remove unused row 1.2 so the table is compact and clean when only 1 key task is specified
        t3.removeChild(t3Rows[2]);
      }
    }
  }

  // 3. Dynamic Paragraph Updates & Clean Page Layout
  const body = xmlDoc.getElementsByTagName("w:body")[0];
  const allParagraphs = Array.from(body.childNodes).filter(n => n.nodeName === "w:p");

  let sec1HeadingP = null;
  let sec2HeadingP = null;
  let sec63P = null;
  const paragraphsToRemove = [];

  for (let i = 0; i < allParagraphs.length; i++) {
    const p = allParagraphs[i];
    const txt = (p.textContent || "").trim();

    // Remove empty paragraphs that create uneven gaps or blank pages
    if (txt.length === 0) {
      paragraphsToRemove.push(p);
      continue;
    }

    // 0. Document Title
    if (txt.includes("แผนการวัดและประเมินผลการเรียนรู้")) {
      setParagraphFormat(p, { keepNext: true, before: 0, after: 40, left: 0, right: 0, firstLine: 0, jc: 'center' });
      while (p.firstChild && p.lastChild.nodeName !== "w:pPr") {
        p.removeChild(p.lastChild);
      }
      p.appendChild(createRun("แผนการวัดและประเมินผลการเรียนรู้", true, 32, null, true));
    }
    // 1. Header Line 1: Course Code, Course Name, Learning Area
    else if (txt.includes("รหัสวิชา") && txt.includes("กลุ่มสาระการเรียนรู้")) {
      const leftText = `รหัสวิชา ${c.course_code} รายวิชา ${c.course_name}`;
      const rightText = `กลุ่มสาระการเรียนรู้${c.learning_area}`;
      const lineSz = (leftText.length + rightText.length > 98) ? 30 : 32;
      setXmlParagraphText(
        p,
        `${leftText}\t${rightText}`,
        true,
        lineSz,
        { keepNext: true, tabs: [{ val: 'right', pos: PAGE_TEXT_WIDTH }], before: 0, after: 0, left: 0, right: 0, firstLine: 0, jc: 'left' }
      );
    }
    // 2. Header Line 2: Grade Level, Term, Year, Hours, Credits
    else if (txt.includes("ระดับชั้น") && txt.includes("ภาคเรียนที่")) {
      const gradeText = c.grade_level.startsWith("ม.") ? `มัธยมศึกษาปีที่ ${c.grade_level.replace("ม.", "")}` : c.grade_level;
      const creditsVal = typeof c.credits === 'number' ? c.credits.toFixed(1) : parseFloat(c.credits || 1).toFixed(1);
      setXmlParagraphText(
        p,
        `ระดับชั้น${gradeText} ภาคเรียนที่ 2 ปีการศึกษา 2569\tเวลา ${c.total_hours} คาบ/ภาคเรียน จำนวน ${creditsVal} หน่วยกิต`,
        true,
        32,
        { keepNext: true, tabs: [{ val: 'right', pos: PAGE_TEXT_WIDTH }], before: 0, after: 0, left: 0, right: 0, firstLine: 0, jc: 'left' }
      );
    }
    // 3. Header Line 3: Teachers
    else if (txt.startsWith("ครูผู้สอน") && !txt.includes("ลงชื่อ")) {
      setXmlParagraphText(
        p,
        `ครูผู้สอน ${tStr}`,
        true,
        32,
        { keepNext: true, before: 0, after: 0, left: 0, right: 0, firstLine: 0, jc: 'left' }
      );
    }
    // 3b. Header Dotted Separator Line (single non-wrapping centered line)
    else if (/^[….]+$/.test(txt)) {
      setXmlParagraphText(
        p,
        "…".repeat(58),
        true,
        32,
        { keepNext: true, before: 0, after: 60, left: 0, right: 0, firstLine: 0, jc: 'center' }
      );
    }
    // 4. Section 1 Heading
    else if (txt.includes("1. ผลการเรียนรู้") || txt.includes("1.มาตรฐานการเรียนรู้") || txt.includes("1. ตัวชี้วัด")) {
      sec1HeadingP = p;
      setXmlParagraphText(
        p,
        isBasic ? "1. มาตรฐานการเรียนรู้ / ตัวชี้วัด" : "1. ผลการเรียนรู้",
        true,
        32,
        { keepNext: true, before: 40, after: 20, left: 0, right: 0, firstLine: 0, jc: 'left' }
      );
    }
    // 5. Section 2 Heading & Ratio lines
    else if (txt.includes("2. การวัดและประเมินผลการเรียนรู้") || txt.includes("2. การวัดและประเมินผล")) {
      sec2HeadingP = p;
      setXmlParagraphText(
        p,
        "2. การวัดและประเมินผลการเรียนรู้",
        true,
        32,
        { keepNext: true, before: 100, after: 20, left: 0, right: 0, firstLine: 0, jc: 'left' }
      );
    } else if (txt.includes("อัตราส่วนการประเมินคะแนน")) {
      setXmlParagraphText(
        p,
        `อัตราส่วนการประเมินคะแนน\t= 70 : 30`,
        false,
        32,
        { keepNext: true, tabs: [{ val: 'left', pos: 4320 }], before: 0, after: 0, left: 720, firstLine: 0, jc: 'left' }
      );
    } else if (txt.includes("ระหว่างภาค") && txt.includes("กลางภาค") && txt.includes("ปลายภาค")) {
      setXmlParagraphText(
        p,
        `ระหว่างภาค : กลางภาค : ปลายภาค\t= 70 : 15 : 15`,
        false,
        32,
        { keepNext: true, tabs: [{ val: 'left', pos: 4320 }], before: 0, after: 0, left: 720, firstLine: 0, jc: 'left' }
      );
    } else if (txt.includes("K") && txt.includes("P") && txt.includes("A") && txt.includes("=")) {
      setXmlParagraphText(
        p,
        `K : P : A\t= ${grand.k} : ${grand.p} : ${grand.a}`,
        false,
        32,
        { keepNext: true, tabs: [{ val: 'left', pos: 4320 }], before: 0, after: 60, left: 720, firstLine: 0, jc: 'left' }
      );
    }
    // Note below Table 0
    else if (txt.startsWith("หมายเหตุ") && txt.includes("SGS")) {
      upgradeRunPropsInTree(p);
      setParagraphFormat(p, { before: 80, after: 80, left: 360, right: 0, firstLine: 0, jc: 'left' });
    }
    // 6. Section 3: เวลาในการสอบ
    else if (txt.includes("3. เวลาในการสอบ")) {
      setXmlParagraphText(
        p,
        "3. เวลาในการสอบ",
        true,
        32,
        { keepNext: true, before: 80, after: 20, left: 0, firstLine: 0, jc: 'left' }
      );
    } else if (txt.includes("กลางภาค") && txt.includes("นาที") && (txt.includes("ปลายภาค") || txt.includes("60"))) {
      setXmlParagraphText(
        p,
        `กลางภาค...........${midDuration}......นาที    ปลายภาค...........${finDuration}......นาที`,
        false,
        32,
        { before: 0, after: 80, left: 720, firstLine: 0, jc: 'left' }
      );
    }
    // 7. Section 4: เกณฑ์การให้ระดับคะแนน
    else if (txt.includes("4. เกณฑ์การให้ระดับคะแนน")) {
      setXmlParagraphText(
        p,
        "4. เกณฑ์การให้ระดับคะแนน",
        true,
        32,
        { keepNext: true, before: 80, after: 40, left: 0, firstLine: 0, jc: 'left' }
      );
    }
    // 8. Section 5: เวลาเรียน
    else if (txt.includes("5. เวลาเรียน")) {
      setXmlParagraphText(
        p,
        "5. เวลาเรียน",
        true,
        32,
        { keepNext: true, before: 120, after: 20, left: 0, firstLine: 0, jc: 'left' }
      );
    } else if (txt.includes("จำนวนคาบเรียนตามหลักสูตร 20 สัปดาห์")) {
      setXmlParagraphText(
        p,
        `จำนวนคาบเรียนตามหลักสูตร 20 สัปดาห์\t= ${c.total_hours} คาบ/ภาคเรียน`,
        false,
        32,
        { keepNext: true, tabs: [{ val: 'left', pos: 4320 }], before: 0, after: 0, left: 720, firstLine: 0, jc: 'left' }
      );
    } else if (txt.includes("จำนวนคาบเรียน") && txt.includes("80%")) {
      setXmlParagraphText(
        p,
        `จำนวนคาบเรียน 80% (ขาดได้ ${m80} คาบ)\t= ${h80} คาบ/ภาคเรียน`,
        false,
        32,
        { keepNext: true, tabs: [{ val: 'left', pos: 4320 }], before: 0, after: 0, left: 720, firstLine: 0, jc: 'left' }
      );
    } else if (txt.includes("จำนวนคาบเรียน") && txt.includes("60%")) {
      setXmlParagraphText(
        p,
        `จำนวนคาบเรียน 60% (ขาดได้ ${m60} คาบ)\t= ${h60} คาบ/ภาคเรียน`,
        false,
        32,
        { tabs: [{ val: 'left', pos: 4320 }], before: 0, after: 80, left: 720, firstLine: 0, jc: 'left' }
      );
    }
    // 9. Section 6: การให้ผลการเรียน “0” “ร” และ “มส”
    else if (txt.startsWith("6.") && txt.includes("การให้ผลการเรียน")) {
      setXmlParagraphText(
        p,
        "6. การให้ผลการเรียน “0” “ร” และ “มส” เป็นดังนี้",
        true,
        32,
        { keepNext: true, before: 80, after: 20, left: 0, firstLine: 0, jc: 'left' }
      );
    } else if (txt.startsWith("6.1") && txt.includes("ได้ผลการเรียน")) {
      const remedyText = isBasic
        ? "ส่งงานเพิ่มเติม"
        : "ทำงานซ่อมเสริม จากนั้นทำแบบทดสอบโดยต้องได้คะแนนเกินครึ่งหนึ่ง";
      setParagraphFormat(p, { keepNext: true, before: 0, after: 20, left: 1140, hanging: 420, jc: 'left' });
      while (p.firstChild && p.lastChild.nodeName !== "w:pPr") p.removeChild(p.lastChild);
      p.appendChild(createRun("6.1 ได้ผลการเรียน “0”", true, 32));
      p.appendChild(createRun(` เนื่องจาก มีคะแนนรวมไม่ถึง 50 และมีวิธีแก้ผลการเรียน “0” โดย${remedyText}`, false, 32));
    } else if (txt.includes("ทำงานซ่อมเสริม")) {
      // Merged into 6.1 above
      paragraphsToRemove.push(p);
    } else if (txt.startsWith("6.2") && txt.includes("ได้ผลการเรียน")) {
      setParagraphFormat(p, { keepNext: true, before: 0, after: 20, left: 720, firstLine: 0, jc: 'left' });
      while (p.firstChild && p.lastChild.nodeName !== "w:pPr") p.removeChild(p.lastChild);
      p.appendChild(createRun("6.2 ได้ผลการเรียน “ร”", true, 32));
      p.appendChild(createRun(" เนื่องจาก", false, 32));
    } else if (txt.includes("1. ไม่ส่งชิ้นงานสำคัญ")) {
      setXmlParagraphText(
        p,
        `1. ไม่ส่งชิ้นงานสำคัญ คือ ${keyTaskText}`,
        false,
        32,
        { keepNext: true, before: 0, after: 40, left: 1080, firstLine: 0, jc: 'left' }
      );
    } else if (txt.includes("2. ผู้เรียนไม่ได้รับการประเมินผล")) {
      setXmlParagraphText(
        p,
        "2. ผู้เรียนไม่ได้รับการประเมินผลตามหน่วยการเรียนรู้ ในช่องของคะแนนวัดผลระหว่างเรียน",
        false,
        32,
        { keepNext: true, before: 40, after: 0, left: 1080, firstLine: 0, jc: 'left' }
      );
    } else if (txt.includes("3. ผู้เรียนไม่ได้วัดผลกลางภาค")) {
      setXmlParagraphText(
        p,
        "3. ผู้เรียนไม่ได้วัดผลกลางภาคเรียนหรือปลายภาคเรียน",
        false,
        32,
        { keepNext: true, before: 0, after: 20, left: 1080, firstLine: 0, jc: 'left' }
      );
    } else if (txt.includes("ได้ผลการเรียน “มส”")) {
      sec63P = p;
      setParagraphFormat(p, { before: 20, after: 120, left: 720, firstLine: 0, jc: 'left' });
      while (p.firstChild && p.lastChild.nodeName !== "w:pPr") p.removeChild(p.lastChild);
      p.appendChild(createRun("6.3 ได้ผลการเรียน “มส”", true, 32));
      p.appendChild(createRun(" เนื่องจาก มีเวลาเรียนไม่ถึง 80%", false, 32));
    }
  }

  paragraphsToRemove.forEach(p => {
    if (p.parentNode === body) body.removeChild(p);
  });

  // 3b. Rebuild Signature Block cleanly after 6.3 (handles 0, 1, 2, 3+ teachers and aligns every name under the dots)
  if (sec63P && body) {
    let curr = sec63P.nextSibling;
    const oldSigNodes = [];
    while (curr && curr.nodeName !== "w:sectPr") {
      oldSigNodes.push(curr);
      curr = curr.nextSibling;
    }
    oldSigNodes.forEach(n => body.removeChild(n));

    const sigRefNode = sectPr || null;
    // With left=2400 twips, "ลงชื่อ" is ~420 twips and 50 dots span ~2820..5070 twips (midpoint = 3945 twips)
    const SIG_LEFT_INDENT = 2400;
    const SIG_DOTS_CENTER = 3945;

    function appendSignaturePair(roleTitle, personName, isFirst = false) {
      const pLine = createP();
      setParagraphFormat(pLine, {
        keepNext: true,
        before: isFirst ? 120 : 180,
        after: 0,
        line: 240,
        left: SIG_LEFT_INDENT,
        firstLine: 0,
        jc: 'left'
      });
      pLine.appendChild(createRun(`ลงชื่อ..................................................${roleTitle}`, false, 32));
      body.insertBefore(pLine, sigRefNode);

      const pName = createP();
      setParagraphFormat(pName, {
        tabs: [{ val: 'center', pos: SIG_DOTS_CENTER }],
        before: 0,
        after: 40,
        line: 240,
        left: 0,
        firstLine: 0,
        jc: 'left'
      });
      pName.appendChild(createTab(32));
      pName.appendChild(createRun(`(${personName})`, false, 32));
      body.insertBefore(pName, sigRefNode);
    }

    const teacherListForSig = validTeachers.length > 0
      ? validTeachers
      : ["....................................................."];

    teacherListForSig.forEach((tName, idx) => {
      appendSignaturePair("ครูผู้สอน", tName, idx === 0);
    });

    appendSignaturePair("หัวหน้างานวัดผลและประเมินผลการเรียนรู้", "นางสาวอโรชา สลุงใหญ่");
    appendSignaturePair("หัวหน้ากลุ่มบริหารวิชาการ", "นายพงศธร แสนเมือง");
    appendSignaturePair("รองผู้อำนวยการกลุ่มบริหารวิชาการ", "นางสาวกมลชนก สุวรรณประเวก");
    appendSignaturePair("ผู้อำนวยการโรงเรียนพัฒนานิคม", "นายธีรพงษ์ ภูธร");
  }

  // Replace Section 1 indicator paragraphs between sec1HeadingP and sec2HeadingP
  if (sec1HeadingP && sec2HeadingP && body) {
    let curr = sec1HeadingP.nextSibling;
    const toRemove = [];
    while (curr && curr !== sec2HeadingP) {
      if (curr.nodeName === "w:p") {
        toRemove.push(curr);
      }
      curr = curr.nextSibling;
    }
    toRemove.forEach(p => body.removeChild(p));

    const refNode = sec2HeadingP;

    if (isBasic) {
      const courseStds = getCourseStandards(c);
      const cleanInds = getCourseCleanBasicIndicators(c);

      // มาตรฐาน  ค 1.2 ...      (label at 0, text column at 3 cm, wrapped lines stay in the column)
      //          ค 1.3 ...
      courseStds.forEach((stdObj, sIdx) => {
        const p = createSec1P(false);
        if (sIdx === 0) p.appendChild(createRun("มาตรฐาน", true, 32));
        p.appendChild(createTab(32));
        p.appendChild(createRun(`${stdObj.code} ${stdObj.desc}`.trim(), false, 32));
        body.insertBefore(p, refNode);
      });

      //     ตัวชี้วัด  ค 1.2 ม.5/2 ...   (label indented 1.27 cm, same text column)
      //              ค 1.3 ม.5/1 ...
      cleanInds.forEach((indText, iIdx) => {
        const p = createSec1P(iIdx === 0);
        if (iIdx === 0) {
          p.appendChild(createTab(32));
          p.appendChild(createRun("ตัวชี้วัด", true, 32));
        }
        p.appendChild(createTab(32));
        p.appendChild(createRun(indText, false, 32));
        body.insertBefore(p, refNode);
      });
    } else {
      // Elective: merged items are split and renumbered 1., 2., 3., ... with clean hanging indent
      splitElectiveOutcomes(c.indicators).forEach((text, i) => {
        const p = createP();
        setParagraphFormat(p, {
          tabs: [{ val: 'left', pos: 1080 }],
          before: 0,
          after: 0,
          line: 240,
          left: 1080,
          hanging: 360,
          jc: 'left'
        });
        p.appendChild(createRun(`${i + 1}.`, false, 32));
        p.appendChild(createTab(32));
        p.appendChild(createRun(text, false, 32));
        body.insertBefore(p, refNode);
      });
    }
  }

  // 4. Anti-red-underline: make sure every run has <w:noProof/> and a Thai <w:lang/>,
  // inserted at the schema-correct position (the old regex prepended duplicates).
  const AFTER_NOPROOF = new Set(['w:snapToGrid', 'w:vanish', 'w:webHidden', 'w:color', 'w:spacing', 'w:w',
    'w:kern', 'w:position', 'w:sz', 'w:szCs', 'w:highlight', 'w:u', 'w:effect', 'w:bdr', 'w:shd',
    'w:fitText', 'w:vertAlign', 'w:rtl', 'w:cs', 'w:em', 'w:lang', 'w:eastAsianLayout', 'w:specVanish',
    'w:oMath', 'w:rPrChange']);
  const AFTER_LANG = new Set(['w:eastAsianLayout', 'w:specVanish', 'w:oMath', 'w:rPrChange']);
  Array.from(xmlDoc.getElementsByTagNameNS(W_NS, 'rPr')).forEach(rPr => {
    if (rPr.parentNode && rPr.parentNode.localName === 'rPrChange') return;
    const kids = () => Array.from(rPr.childNodes).filter(n => n.nodeType === 1);
    const ensure = (name, afterSet, attrs) => {
      if (kids().some(k => k.nodeName === name)) return;
      const el = xmlDoc.createElementNS(W_NS, name);
      Object.entries(attrs || {}).forEach(([k, v]) => el.setAttributeNS(W_NS, k, v));
      rPr.insertBefore(el, kids().find(k => afterSet.has(k.nodeName)) || null);
    };
    ensure('w:noProof', AFTER_NOPROOF);
    ensure('w:lang', AFTER_LANG, { 'w:val': 'th-TH', 'w:eastAsia': 'th-TH', 'w:bidi': 'th-TH' });
  });

  // 5. Serialize back to XML String
  const serializer = new XMLSerializer();
  const updatedXmlStr = serializer.serializeToString(xmlDoc);

  zip.file("word/document.xml", updatedXmlStr);

  const outBlob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });

  const typePrefix = isBasic ? "วิชาพื้นฐาน" : "วิชาเพิ่มเติม";
  const fileName = `วผ19_${c.course_code}_${c.course_name}_(${typePrefix})_2-2569.docx`;
  saveAs(outBlob, fileName);
}

// Doctor/admin panel copy. Marathi first; English mirrors it. (No Hindi.)
export const doctorMr = {
  nav: { today: 'आज', patients: 'पेशंट्स', alerts: 'अलर्ट', me: 'मी' },
  hello: 'नमस्कार डॉक्टर 🙏',
  stats: { active: 'सक्रिय पेशंट्स', checkins: 'आजचे फोटो', to_react: 'उत्तर बाकी', alerts: 'अलर्ट' },
  alerts: { title: '🆘 तातडीचे अलर्ट', none: 'कोणताही अलर्ट नाही ✓', seen: 'पाहिलं', resolve: 'सोडवलं', call: 'कॉल करा', no_note: '(काही लिहिलं नाही)' },
  plates: { title: 'ताट पुनरावलोकन', none: 'आज अजून फोटो नाहीत.', reply: 'उत्तर लिहा…', send: 'पाठवा', quick: ['छान! 👍', 'भाजी वाढवा 🥗', 'भात कमी करा 🍚', 'पाणी जास्त प्या 💧'], replied: 'उत्तर दिलं' },
  quiet: { title: '2+ दिवस गायब', none: 'सगळे सक्रिय आहेत ✓', never: 'अजून सुरुवात नाही', last: 'शेवटचं: {{d}}' },
  patients: { title: 'पेशंट्स', search: 'नाव शोधा…', add: '+ नवीन पेशंट', joined: 'ॲपवर आहे', invited: 'आमंत्रित', empty: 'अजून पेशंट नाहीत.' },
  form: {
    title: 'नवीन पेशंट', name: 'पूर्ण नाव *', email: 'ईमेल (ज्याने ते लॉगिन करतील) *', phone: 'मोबाईल', start_w: 'सुरुवातीचं वजन (kg)', target_w: 'लक्ष्य वजन (kg)',
    start_date: 'सुरुवात तारीख', conditions: 'आजार (असल्यास)', save: 'पेशंट जोडा', saved: 'पेशंट जोडला ✓ — ते या ईमेलने लॉगिन करताच जोडले जातील.',
    cond: { diabetes: 'मधुमेह', thyroid: 'थायरॉईड', pcod: 'PCOD', bp: 'BP', pregnancy: 'गर्भावस्था', other: 'इतर' },
    bad: 'नाव आणि योग्य ईमेल आवश्यक.', dup: 'हा ईमेल आधीच वापरला आहे.',
  },
  profile: {
    back: '← पेशंट्स', weight: 'वजन', start: 'सुरुवात', now: 'आता', target: 'लक्ष्य', checkins: 'अलीकडील ताट', plans: 'आठवड्याचा प्लॅन',
    doctor_only: 'फक्त डॉक्टर (आजार आहे)', not_joined: 'अजून ॲपवर लॉगिन केलं नाही', no_logs: 'अजून नोंद नाही.',
  },
  plan: {
    new: '+ नवीन आठवड्याचा प्लॅन', week: 'आठवडा', focus: 'या आठवड्याचं लक्ष्य', note: 'पेशंटसाठी संदेश', meals: 'जेवण (प्रत्येक ओळ: वेळ - पदार्थ)',
    meals_ph: '8:00 - पोहे + ताक\n1:30 - 2 भाकरी + भाजी + डाळ\n8:00 - सूप + कोशिंबीर', draft: 'मसुदा सेव्ह', approve: '✓ मंजूर करून पाठवा',
    approved: 'मंजूर', drafted: 'मसुदा', saved: 'प्लॅन सेव्ह झाला ✓', sent: 'प्लॅन पेशंटला दिसू लागला ✓',
  },
  me: { title: 'प्रोफाइल', role_doctor: 'डॉक्टर / ॲडमिन', role_staff: 'स्टाफ' },
  ago: { now: 'आत्ता', m: '{{n}} मि. आधी', h: '{{n}} तास आधी', d: '{{n}} दिवस आधी' },
  fail: 'झालं नाही. पुन्हा प्रयत्न करा.',
}
export type DoctorCopy = typeof doctorMr
export const doctorEn: DoctorCopy = {
  nav: { today: 'Today', patients: 'Patients', alerts: 'Alerts', me: 'Me' },
  hello: 'Hello Doctor 🙏',
  stats: { active: 'Active patients', checkins: 'Photos today', to_react: 'To reply', alerts: 'Alerts' },
  alerts: { title: '🆘 Urgent alerts', none: 'No alerts ✓', seen: 'Seen', resolve: 'Resolved', call: 'Call', no_note: '(no note)' },
  plates: { title: 'Plate review', none: 'No photos yet today.', reply: 'Write a reply…', send: 'Send', quick: ['Great! 👍', 'Add more veggies 🥗', 'Less rice please 🍚', 'Drink more water 💧'], replied: 'Replied' },
  quiet: { title: 'Quiet 2+ days', none: 'Everyone is active ✓', never: 'Not started yet', last: 'Last: {{d}}' },
  patients: { title: 'Patients', search: 'Search name…', add: '+ New patient', joined: 'On app', invited: 'Invited', empty: 'No patients yet.' },
  form: {
    title: 'New patient', name: 'Full name *', email: 'Email (they will log in with) *', phone: 'Mobile', start_w: 'Start weight (kg)', target_w: 'Target weight (kg)',
    start_date: 'Start date', conditions: 'Conditions (if any)', save: 'Add patient', saved: 'Patient added ✓ — they will be linked as soon as they log in with this email.',
    cond: { diabetes: 'Diabetes', thyroid: 'Thyroid', pcod: 'PCOD', bp: 'BP', pregnancy: 'Pregnancy', other: 'Other' },
    bad: 'Name and a valid email are required.', dup: 'This email is already used.',
  },
  profile: {
    back: '← Patients', weight: 'Weight', start: 'Start', now: 'Now', target: 'Target', checkins: 'Recent plates', plans: 'Weekly plan',
    doctor_only: 'Doctor only (has condition)', not_joined: 'Has not logged in yet', no_logs: 'No entries yet.',
  },
  plan: {
    new: '+ New weekly plan', week: 'Week', focus: 'Focus this week', note: 'Message for the patient', meals: 'Meals (each line: time - food)',
    meals_ph: '8:00 - Poha + buttermilk\n1:30 - 2 bhakri + sabzi + dal\n8:00 - Soup + salad', draft: 'Save draft', approve: '✓ Approve & send',
    approved: 'Approved', drafted: 'Draft', saved: 'Plan saved ✓', sent: 'Plan is now visible to the patient ✓',
  },
  me: { title: 'Profile', role_doctor: 'Doctor / Admin', role_staff: 'Staff' },
  ago: { now: 'just now', m: '{{n}} min ago', h: '{{n}} h ago', d: '{{n}} d ago' },
  fail: 'Did not work. Please try again.',
}

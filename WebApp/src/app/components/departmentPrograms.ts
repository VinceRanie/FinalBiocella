export const departmentPrograms = {
  "Department of Accountancy": ["Accountancy"],
  "Department of Anthropology, Sociology and History": [
    "Bachelor of Arts major in Anthropology",
    "Graduate Certificate in Cebuano Heritage Studies and Conservation Management",
    "Graduate Certificate in Sustainable Community Development",
    "Master of Arts in Anthropology",
  ],
  "Department of Architecture": [
    "Bachelor of Science in Architecture",
    "Bachelor of Science in Environmental Planning",
    "Bachelor of Science in Interior Design",
    "Bachelor of Science in Landscape Architecture",
    "Master in Urban Planning",
    "Master of Architecture",
  ],
  "Department of Biology": [
    "Bachelor of Science in Biology",
    "Bachelor of Science in Marine Biology",
    "Doctor of Philosophy in Biology - Bioscience Track",
    "Master of Science in Biology",
    "Master of Science in Environmental Science",
    "Master of Science in Marine Biology",
  ],
  "Department of Business Administration": [
    "Bachelor of Science in Business Administration",
    "Bachelor of Science in Entrepreneurship",
    "Master of Management",
  ],
  "Department of Chemical Engineering": [
    "Bachelor of Science in Chemical Engineering",
    "Master of Science in Chemical Engineering",
  ],
  "Department of Chemistry": [
    "Bachelor of Science in Chemistry",
    "Doctor of Philosophy in Chemistry",
    "Master of Science in Chemistry",
  ],
  "Department of Civil Engineering": [
    "Bachelor of Science in Civil Engineering",
    "Master of Science in Civil Engineering with specialization in Structural Engineering",
    "Master of Science in Civil Engineering with specialization in Water Resources and Environment",
  ],
  "Department of Communications, Linguistics, and Literature": [
    "Bachelor of Arts in Applied Linguistics",
    "Bachelor of Arts in Communication, major in Corporate Communication",
    "Bachelor of Arts in Communication, major in Media",
    "Bachelor of Arts in English Language Studies",
    "Bachelor of Arts in Literature",
    "Master of Arts in Applied Linguistics",
    "Master of Arts in Literature",
  ],
  "Department of Computer Engineering": [
    "Bachelor of Science in Computer Engineering",
    "Master of Engineering in Computer Engineering",
    "Master of Science in Computer Engineering",
  ],
  "Department of Computer, Information Sciences and Mathematics": [
    "Associate in Computer Technology major in Multimedia Technology",
    "Bachelor of Library and Information Science",
    "Bachelor of Science in Computer Science",
    "Bachelor of Science in Information and Communications Technology",
    "Bachelor of Science in Information Technology",
    "Bachelor of Science in Mathematics",
    "Master of Science in Information Technology",
    "Master of Science in Library and Information Science",
    "Master of Science in Mathematics",
  ],
  "Department of Economics": ["Bachelor of Science in Economics", "Master of Arts in Economics"],
  "Department of Electrical and Electronics Engineering": [
    "Bachelor of Science in Electrical Engineering",
    "Bachelor of Science in Electronics Engineering",
  ],
  "Department of Fine Arts": [
    "Bachelor of Fine Arts major in Advertising Arts",
    "Bachelor of Fine Arts major in Cinema",
    "Bachelor of Fine Arts major in Fashion Design",
    "Bachelor of Fine Arts major in Painting",
    "Master of Fine Arts in Cinema Studies",
  ],
  "Department of Hospitality Management": [
    "Bachelor of Science in Hospitality Management",
    "Bachelor of Science in Tourism Management",
    "Diploma in Culinary Arts (Two-Year Program)",
  ],
  "Department of Industrial Engineering": [
    "Bachelor of Science in Industrial Engineering",
    "Master of Engineering in Industrial Engineering (Professional Track)",
    "Master of Science in Industrial Engineering (Academic Track)",
  ],
  "Department of Mechanical and Manufacturing Engineering": ["Bachelor of Science in Mechanical Engineering"],
  "Department of Nursing": [
    "Bachelor of Science in Nursing",
    "Master of Arts in Nursing major in Clinical Supervision",
  ],
  "Department of Nutrition and Dietetics": ["Bachelor of Science in Nutrition and Dietetics"],
  "Department of Philosophy": [
    "Bachelor of Philosophy",
    "Doctor of Philosophy in Philosophy",
    "Master of Arts in Philosophy",
  ],
  "Department of Pharmacy": [
    "Bachelor of Science in Pharmacy",
    "Doctor of Pharmacy",
    "Master of Science in Pharmaceutical Sciences",
    "Master of Science in Pharmacy",
  ],
  "Department of Physics": [
    "Bachelor of Science in Applied Physics",
    "Doctor of Philosophy in Physics",
    "Master of Science in Physics",
  ],
  "Department of Political Science": [
    "Bachelor of Arts in Political Science, major in International Relations and Foreign Service",
    "Bachelor of Arts in Political Science, major in Law and Policy Studies",
    "Master of Arts in Political Science",
    "Master of Arts in Public Management and Development",
  ],
  "Department of Psychology": [
    "Bachelor of Science in Psychology",
    "Master of Arts in Clinical Psychology",
    "Master of Arts in Psychology",
  ],
  "Department of Teacher Education": ["Education"],
  "College of Law": [
    "Juris Doctor",
    "Juris Doctor with specialization in Business",
    "Juris Doctor with specialization in Corporate Practice",
    "Juris Doctor with specialization in Government Service",
    "Juris Doctor with specialization in Litigation",
    "Juris Doctor with Thesis",
  ],
} as const;

export type DepartmentName = keyof typeof departmentPrograms;
export type ProgramName = (typeof departmentPrograms)[DepartmentName][number];

export const departments = Object.keys(departmentPrograms).sort((left, right) => left.localeCompare(right));

export const getProgramsForDepartment = (department: string) => {
  return department && department in departmentPrograms
    ? [...departmentPrograms[department as DepartmentName]].sort((left, right) => left.localeCompare(right))
    : [];
};

ALTER TABLE mentors ADD COLUMN rating_out_of INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mentors ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mentors ADD COLUMN students_trained INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mentors ADD COLUMN interviews_taken INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mentors ADD COLUMN interviews_given INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mentors ADD COLUMN offers TEXT NOT NULL DEFAULT '[]';

UPDATE mentors
SET
  headline = 'Cybersecurity, cloud security, pen testing, Azure, AWS, and WAF.',
  bio = 'Ram Dixit sits with working engineers on live problems: cybersecurity, cloud security, penetration testing, Azure security, AWS security, Cloudflare WAF, Barracuda WAF, and Akamai. The same desk covers Zscaler, Palo Alto, FortiGate, F5, Cisco, and Prisma Access. You also get job support, online interview practice, and help to crack the interview. 700 students trained. Rated 5 out of 5 by 129 students. 500 interviews taken. 300 interviews given by him.',
  tracks = '["Cybersecurity","Cloud security","Penetration testing","Azure security","AWS security","Cloudflare WAF","Barracuda WAF","Akamai","Zscaler ZIA","Zscaler ZPA","Palo Alto NGFW","Prisma Access","FortiGate","F5 BIG-IP","Cisco ISE"]',
  weekly_includes = 'One 60-minute working call on the issue you bring, plus written replies for 7 days. Includes job support and online interview practice for that issue.',
  monthly_includes = 'Four 60-minute working calls in the month, plus written replies. Includes job support, online interview practice, and help to crack the interview.',
  offers = '["Job support","Online interview practice","Help to crack the interview"]',
  rating_out_of = 5,
  rating_count = 129,
  students_trained = 700,
  interviews_taken = 500,
  interviews_given = 300
WHERE slug = 'ram-dixit';

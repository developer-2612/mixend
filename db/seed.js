import pg from "pg";
import { initDatabase } from "./init.js";
import { hashPassword } from "../lib/auth.js";
import { getDummyOrders } from "../lib/orders-dummy.js";

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

const TARGETS = {
  admins: 7,
  users: 10,
  messages: 10,
  requirements: 8,
  appointments: 6,
  needs: 8,
  broadcasts: 5,
  templates: 6,
  catalog: 10,
};

const CATALOG_PER_ADMIN = 10;
const APPOINTMENTS_PER_ADMIN = 6;

const adminSeeds = [
  {
    name: "Neha Sharma",
    phone: "9000000001",
    email: "neha.admin1@example.com",
    profession: "astrology",
    whatsapp_name: "Neha S",
  },
  {
    name: "Arjun Mehta",
    phone: "9000000002",
    email: "arjun.admin2@example.com",
    profession: "gym",
    whatsapp_name: "Arjun M",
  },
  {
    name: "Zara Khan",
    phone: "9000000003",
    email: "zara.admin3@example.com",
    profession: "restaurant",
    whatsapp_name: "Zara K",
  },
  {
    name: "Vivaan Patel",
    phone: "9000000004",
    email: "vivaan.admin4@example.com",
    profession: "salon",
    whatsapp_name: "Vivaan P",
  },
  {
    name: "Meera Iyer",
    phone: "9000000005",
    email: "meera.admin5@example.com",
    profession: "clinic",
    whatsapp_name: "Meera I",
  },
  {
    name: "Rohan Das",
    phone: "9000000006",
    email: "rohan.admin6@example.com",
    profession: "ecommerce",
    whatsapp_name: "Rohan D",
  },
  {
    name: "Priya Gupta",
    phone: "9000000007",
    email: "priya.admin7@example.com",
    profession: "shop",
    whatsapp_name: "Priya G",
  },
];

const userSeeds = [
  { name: "Aarav Rao", phone: "9100000001", email: "aarav@example.com" },
  { name: "Diya Sen", phone: "9100000002", email: "diya@example.com" },
  { name: "Kabir Joshi", phone: "9100000003", email: "kabir@example.com" },
  { name: "Nisha Verma", phone: "9100000004", email: "nisha@example.com" },
  { name: "Ritika Das", phone: "9100000005", email: "ritika@example.com" },
  { name: "Ishaan Kapoor", phone: "9100000006", email: "ishaan@example.com" },
  { name: "Maya Singh", phone: "9100000007", email: "maya@example.com" },
  { name: "Ravi Kumar", phone: "9100000008", email: "ravi@example.com" },
  { name: "Sara Ali", phone: "9100000009", email: "sara@example.com" },
  { name: "Tanvi Shah", phone: "9100000010", email: "tanvi@example.com" },
];

const messageSeeds = [
  { text: "Hi, I want to know your pricing.", type: "incoming", status: "read" },
  { text: "Sure, I can share the brochure.", type: "outgoing", status: "delivered" },
  { text: "Can we book a session this week?", type: "incoming", status: "read" },
  { text: "We have a slot at 4 PM tomorrow.", type: "outgoing", status: "sent" },
  { text: "Please send the payment link.", type: "incoming", status: "delivered" },
  { text: "Link sent. Let me know if you face issues.", type: "outgoing", status: "read" },
  { text: "Do you offer weekend appointments?", type: "incoming", status: "sent" },
  { text: "Yes, Saturday 11 AM is available.", type: "outgoing", status: "delivered" },
  { text: "I want to update my profile details.", type: "incoming", status: "read" },
  { text: "I have updated it for you.", type: "outgoing", status: "read" },
];

const requirementSeeds = [
  { text: "Need pricing for premium package", category: "pricing", status: "pending" },
  { text: "Looking for personalized consultation", category: "service", status: "in_progress" },
  { text: "Want to compare package tiers", category: "pricing", status: "pending" },
  { text: "Interested in monthly subscription", category: "subscription", status: "completed" },
  { text: "Need details about add-on services", category: "service", status: "pending" },
  { text: "Requesting product demo", category: "demo", status: "in_progress" },
  { text: "Need refund policy details", category: "policy", status: "completed" },
  { text: "Asking about group discounts", category: "discount", status: "pending" },
];

const needSeeds = [
  { text: "Send brochure PDF", priority: "high", status: "open" },
  { text: "Schedule follow-up call", priority: "medium", status: "assigned" },
  { text: "Share payment link", priority: "urgent", status: "open" },
  { text: "Update customer details", priority: "low", status: "completed" },
  { text: "Collect feedback after session", priority: "medium", status: "open" },
  { text: "Confirm appointment slot", priority: "high", status: "assigned" },
  { text: "Send invoice copy", priority: "medium", status: "open" },
  { text: "Offer upgrade discount", priority: "low", status: "completed" },
];

const broadcastSeeds = [
  {
    title: "Weekly Tips",
    message: "Here are this week's top tips for better results.",
    status: "sent",
  },
  {
    title: "New Package Launch",
    message: "We launched a new premium package with added benefits.",
    status: "scheduled",
  },
  {
    title: "Weekend Offer",
    message: "Book this weekend and get a special discount.",
    status: "draft",
  },
  {
    title: "Service Update",
    message: "We have expanded our service hours for your convenience.",
    status: "sent",
  },
  {
    title: "Feedback Request",
    message: "We value your feedback. Share your experience.",
    status: "failed",
  },
];

const templateSeeds = [
  {
    name: "Welcome Message",
    category: "onboarding",
    content: "Welcome to AlgoAura! Let us know how we can help.",
    variables_json: '["name"]',
  },
  {
    name: "Follow-up Reminder",
    category: "followup",
    content: "Just checking in. Do you want to proceed with the next step?",
    variables_json: '["name","service"]',
  },
  {
    name: "Payment Link",
    category: "billing",
    content: "Here is your payment link: {{link}}",
    variables_json: '["link"]',
  },
  {
    name: "Appointment Confirmed",
    category: "appointments",
    content: "Your appointment is confirmed for {{date}} at {{time}}.",
    variables_json: '["date","time"]',
  },
  {
    name: "Request Feedback",
    category: "feedback",
    content: "How was your experience? We would love your feedback.",
    variables_json: "[]",
  },
  {
    name: "Service Update",
    category: "updates",
    content: "We have updated our service catalog. Check it out.",
    variables_json: "[]",
  },
];

const catalogByProfession = {
  astrology: {
    services: [
      { name: "Birth Chart Reading", category: "consultation", description: "Detailed natal chart analysis.", price_label: "INR 999", duration_minutes: 60 },
      { name: "Compatibility Match", category: "consultation", description: "Relationship and partnership insights.", price_label: "INR 1199", duration_minutes: 75 },
      { name: "Career Guidance", category: "consultation", description: "Career path and timing guidance.", price_label: "INR 899", duration_minutes: 50 },
      { name: "Annual Forecast", category: "consultation", description: "Year-ahead predictions and planning.", price_label: "INR 1499", duration_minutes: 90 },
      { name: "Remedial Session", category: "support", description: "Personalized remedy recommendations.", price_label: "INR 699", duration_minutes: 40 },
    ],
    products: [
      { name: "Personalized Report PDF", category: "digital", description: "Custom horoscope report.", price_label: "INR 499" },
      { name: "Gemstone Guide", category: "digital", description: "Recommended gemstones and care.", price_label: "INR 299" },
      { name: "Monthly Horoscope Pack", category: "subscription", description: "Monthly guidance pack.", price_label: "INR 399" },
      { name: "Ritual Kit", category: "merchandise", description: "Curated ritual essentials.", price_label: "INR 899" },
      { name: "Consultation Bundle", category: "bundle", description: "Pack of 3 sessions.", price_label: "INR 2499" },
    ],
  },
  clinic: {
    services: [
      { name: "Initial Consultation", category: "consultation", description: "First-time assessment.", price_label: "INR 699", duration_minutes: 30 },
      { name: "Follow-up Visit", category: "consultation", description: "Review progress and adjust plan.", price_label: "INR 499", duration_minutes: 20 },
      { name: "Diet Plan Session", category: "wellness", description: "Personalized nutrition plan.", price_label: "INR 799", duration_minutes: 45 },
      { name: "Diagnostics Review", category: "diagnostics", description: "Test review and guidance.", price_label: "INR 599", duration_minutes: 25 },
      { name: "Teleconsultation", category: "telehealth", description: "Online visit with doctor.", price_label: "INR 399", duration_minutes: 20 },
    ],
    products: [
      { name: "Wellness Kit", category: "merchandise", description: "Daily wellness essentials.", price_label: "INR 999" },
      { name: "Vitamin Pack", category: "supplements", description: "30-day supplement pack.", price_label: "INR 799" },
      { name: "Health Tracker", category: "device", description: "Basic health tracking device.", price_label: "INR 1999" },
      { name: "Care Bundle", category: "bundle", description: "Consultation + kit bundle.", price_label: "INR 1499" },
      { name: "Clinic Voucher", category: "voucher", description: "Gift voucher for visits.", price_label: "INR 499" },
    ],
  },
  salon: {
    services: [
      { name: "Haircut + Styling", category: "hair", description: "Signature cut and styling.", price_label: "INR 699", duration_minutes: 45 },
      { name: "Hair Spa", category: "hair", description: "Deep conditioning spa.", price_label: "INR 999", duration_minutes: 60 },
      { name: "Facial Treatment", category: "skin", description: "Glow facial treatment.", price_label: "INR 1199", duration_minutes: 60 },
      { name: "Manicure + Pedicure", category: "nails", description: "Full hand and feet care.", price_label: "INR 899", duration_minutes: 70 },
      { name: "Bridal Trial", category: "makeup", description: "Makeup & hair trial.", price_label: "INR 1999", duration_minutes: 90 },
    ],
    products: [
      { name: "Haircare Kit", category: "merchandise", description: "Shampoo + conditioner set.", price_label: "INR 599" },
      { name: "Skincare Kit", category: "merchandise", description: "Cleanser + serum kit.", price_label: "INR 899" },
      { name: "Luxury Shampoo", category: "merchandise", description: "Premium shampoo bottle.", price_label: "INR 499" },
      { name: "Gift Voucher", category: "voucher", description: "Salon gift voucher.", price_label: "INR 999" },
      { name: "Styling Pack", category: "bundle", description: "Haircare + styling kit.", price_label: "INR 1299" },
    ],
  },
  restaurant: {
    services: [
      { name: "Table Reservation", category: "booking", description: "Priority table booking.", price_label: "INR 199", duration_minutes: 30 },
      { name: "Private Dining", category: "booking", description: "Private dining experience.", price_label: "INR 1499", duration_minutes: 120 },
      { name: "Catering Consultation", category: "events", description: "Plan a catering event.", price_label: "INR 499", duration_minutes: 40 },
      { name: "Chef's Table", category: "experience", description: "Exclusive chef tasting.", price_label: "INR 1999", duration_minutes: 90 },
      { name: "Tasting Menu", category: "experience", description: "Curated tasting menu.", price_label: "INR 1299", duration_minutes: 75 },
    ],
    products: [
      { name: "Family Meal Box", category: "food", description: "Meal box for four.", price_label: "INR 899" },
      { name: "Party Pack", category: "food", description: "Party platter pack.", price_label: "INR 1499" },
      { name: "Dessert Box", category: "food", description: "Assorted desserts.", price_label: "INR 499" },
      { name: "Signature Sauce", category: "merchandise", description: "House special sauce bottle.", price_label: "INR 299" },
      { name: "Gift Card", category: "voucher", description: "Restaurant gift card.", price_label: "INR 999" },
    ],
  },
  shop: {
    services: [
      { name: "Personal Shopping", category: "service", description: "Guided shopping session.", price_label: "INR 499", duration_minutes: 45 },
      { name: "Gift Wrapping", category: "service", description: "Premium gift wrapping.", price_label: "INR 99", duration_minutes: 10 },
      { name: "Product Demo", category: "service", description: "Hands-on product demo.", price_label: "INR 199", duration_minutes: 20 },
      { name: "Size Consultation", category: "service", description: "Help with sizing and fit.", price_label: "INR 199", duration_minutes: 15 },
      { name: "Delivery Setup", category: "service", description: "Same-day delivery setup.", price_label: "INR 149", duration_minutes: 15 },
    ],
    products: [
      { name: "Starter Pack", category: "bundle", description: "Best-sellers combo.", price_label: "INR 999" },
      { name: "Premium Bundle", category: "bundle", description: "Premium collection pack.", price_label: "INR 1999" },
      { name: "Accessories Kit", category: "accessories", description: "Accessory essentials.", price_label: "INR 599" },
      { name: "Seasonal Collection", category: "collection", description: "Latest seasonal picks.", price_label: "INR 1499" },
      { name: "Gift Box", category: "gift", description: "Gift-ready box.", price_label: "INR 799" },
    ],
  },
  gym: {
    services: [
      { name: "Fitness Assessment", category: "fitness", description: "Body composition check.", price_label: "INR 499", duration_minutes: 30 },
      { name: "Personal Training", category: "fitness", description: "1:1 training session.", price_label: "INR 999", duration_minutes: 60 },
      { name: "Nutrition Coaching", category: "wellness", description: "Personalized diet plan.", price_label: "INR 699", duration_minutes: 45 },
      { name: "Group Class Pass", category: "fitness", description: "Access to group classes.", price_label: "INR 599", duration_minutes: 60 },
      { name: "Physio Session", category: "recovery", description: "Recovery & mobility session.", price_label: "INR 899", duration_minutes: 45 },
    ],
    products: [
      { name: "Protein Pack", category: "supplements", description: "Protein starter kit.", price_label: "INR 1299" },
      { name: "Gym Gear Kit", category: "merchandise", description: "Bottle + towel + gloves.", price_label: "INR 799" },
      { name: "Recovery Kit", category: "recovery", description: "Foam roller + band.", price_label: "INR 999" },
      { name: "Fitness Tracker", category: "device", description: "Basic fitness tracker.", price_label: "INR 2499" },
      { name: "Wellness Bundle", category: "bundle", description: "Supplements + gear.", price_label: "INR 1999" },
    ],
  },
  ecommerce: {
    services: [
      { name: "Priority Support", category: "support", description: "24/7 priority support.", price_label: "INR 299", duration_minutes: 0 },
      { name: "Gift Wrapping", category: "service", description: "Gift wrapping add-on.", price_label: "INR 99", duration_minutes: 10 },
      { name: "Fast Delivery", category: "delivery", description: "Next-day delivery upgrade.", price_label: "INR 149", duration_minutes: 0 },
      { name: "Product Consultation", category: "service", description: "Help choosing products.", price_label: "INR 199", duration_minutes: 15 },
      { name: "Subscription Setup", category: "service", description: "Monthly subscription onboarding.", price_label: "INR 199", duration_minutes: 20 },
    ],
    products: [
      { name: "Starter Bundle", category: "bundle", description: "Starter product bundle.", price_label: "INR 799" },
      { name: "Pro Kit", category: "bundle", description: "Pro-level kit.", price_label: "INR 1499" },
      { name: "Monthly Subscription", category: "subscription", description: "Monthly delivery pack.", price_label: "INR 999" },
      { name: "Gift Card", category: "voucher", description: "Store gift card.", price_label: "INR 499" },
      { name: "Accessories Pack", category: "accessories", description: "Accessory essentials.", price_label: "INR 599" },
    ],
  },
  default: {
    services: [
      { name: "Initial Consultation", category: "consultation", description: "One-on-one session.", price_label: "INR 499", duration_minutes: 30 },
      { name: "Follow-up Session", category: "consultation", description: "Progress review session.", price_label: "INR 399", duration_minutes: 20 },
      { name: "Premium Session", category: "consultation", description: "Extended deep-dive session.", price_label: "INR 999", duration_minutes: 60 },
      { name: "Group Workshop", category: "workshop", description: "Interactive workshop.", price_label: "INR 1299", duration_minutes: 90 },
      { name: "Express Session", category: "consultation", description: "Quick consult.", price_label: "INR 299", duration_minutes: 20 },
    ],
    products: [
      { name: "Starter Kit", category: "merchandise", description: "Starter guidance pack.", price_label: "INR 299" },
      { name: "Premium Guide", category: "digital", description: "Advanced tips guide.", price_label: "INR 199" },
      { name: "Gift Voucher", category: "voucher", description: "Gift voucher.", price_label: "INR 499" },
      { name: "Monthly Planner", category: "stationery", description: "Monthly planner.", price_label: "INR 199" },
      { name: "VIP Package", category: "bundle", description: "Priority support pack.", price_label: "INR 1499" },
    ],
  },
};

const getCatalogSeedsForProfession = (profession) =>
  catalogByProfession[profession] || catalogByProfession.default;

async function getCount(client, table) {
  const { rows } = await client.query(`SELECT COUNT(*) AS count FROM ${table}`);
  return Number(rows?.[0]?.count || 0);
}

function addDays(base, days, hours = 10) {
  const date = new Date(base.getTime());
  date.setDate(date.getDate() + days);
  date.setHours(hours, 0, 0, 0);
  return date;
}

async function seedDatabase() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required for seeding.");
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  const inserted = {};
  const mark = (key) => {
    inserted[key] = (inserted[key] || 0) + 1;
  };

  try {
    const existingAdmins = await client.query(
      "SELECT id, phone, email, profession FROM admins ORDER BY id"
    );
    const adminPhones = new Set(existingAdmins.rows.map((row) => row.phone));
    const adminsNeeded = Math.max(0, TARGETS.admins - existingAdmins.rows.length);
    const adminToInsert = adminSeeds
      .filter((admin) => !adminPhones.has(admin.phone))
      .slice(0, adminsNeeded);

    for (const admin of adminToInsert) {
      await client.query(
        `
        INSERT INTO admins
          (name, phone, email, password_hash, admin_tier, status, profession, whatsapp_number, whatsapp_name)
        VALUES ($1, $2, $3, $4, 'client_admin', 'active', $5, $6, $7)
        ON CONFLICT (phone) DO NOTHING
        `,
        [
          admin.name,
          admin.phone,
          admin.email,
          hashPassword("Password@123"),
          admin.profession,
          admin.phone,
          admin.whatsapp_name,
        ]
      );
      mark("admins");
    }

    const { rows: admins } = await client.query(
      "SELECT id, name, profession FROM admins ORDER BY id"
    );
    if (!admins.length) {
      throw new Error("No admins found for seeding.");
    }

    const usersCount = await getCount(client, "contacts");
    const usersNeeded = Math.max(0, TARGETS.users - usersCount);
    const existingUsers = await client.query("SELECT phone FROM contacts");
    const userPhones = new Set(existingUsers.rows.map((row) => row.phone));
    const usersToInsert = userSeeds
      .filter((user) => !userPhones.has(user.phone))
      .slice(0, usersNeeded);

    for (let i = 0; i < usersToInsert.length; i += 1) {
      const user = usersToInsert[i];
      const admin = admins[i % admins.length];
      await client.query(
        `
        INSERT INTO contacts (phone, name, email, assigned_admin_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (phone) DO NOTHING
        `,
        [user.phone, user.name, user.email, admin.id]
      );
      mark("users");
    }

    const { rows: users } = await client.query(
      "SELECT id, name, assigned_admin_id FROM contacts ORDER BY id"
    );
    if (!users.length) {
      throw new Error("No users found for seeding.");
    }

    const messagesCount = await getCount(client, "contact_messages");
    const messagesNeeded = Math.max(0, TARGETS.messages - messagesCount);
    let messagesInserted = 0;
    for (let i = 0; i < messageSeeds.length && messagesInserted < messagesNeeded; i += 1) {
      const seed = messageSeeds[i];
      const user = users[i % users.length];
      const admin =
        admins.find((row) => row.id === user.assigned_admin_id) ||
        admins[i % admins.length];
      const { rowCount } = await client.query(
        "SELECT 1 FROM contact_messages WHERE user_id = $1 AND message_text = $2 LIMIT 1",
        [user.id, seed.text]
      );
      if (rowCount === 0) {
        await client.query(
          `
          INSERT INTO contact_messages (user_id, admin_id, message_text, message_type, status, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW() - ($6 || ' hours')::interval)
          `,
          [user.id, admin.id, seed.text, seed.type, seed.status, i + 1]
        );
        messagesInserted += 1;
        mark("messages");
      }
    }

    const { rows: messageCounts } = await client.query(
      "SELECT user_id, COUNT(*)::int AS count FROM contact_messages GROUP BY user_id"
    );
    const messageByUser = new Map(
      messageCounts.map((row) => [row.user_id, row.count])
    );
    for (let i = 0; i < users.length; i += 1) {
      const user = users[i];
      const count = messageByUser.get(user.id) || 0;
      if (count >= 2) continue;
      const admin =
        admins.find((row) => row.id === user.assigned_admin_id) ||
        admins[i % admins.length];
      const incomingText = `Hi ${admin?.name || "there"}, I have a quick question.`;
      const outgoingText = `Sure! I can help you with that.`;
      await client.query(
        `
        INSERT INTO contact_messages (user_id, admin_id, message_text, message_type, status, created_at)
        VALUES ($1, $2, $3, 'incoming', 'read', NOW() - '2 hours'::interval),
               ($1, $2, $4, 'outgoing', 'delivered', NOW() - '1 hours'::interval)
        `,
        [user.id, admin.id, incomingText, outgoingText]
      );
      mark("messages");
    }

    const reqCount = await getCount(client, "requirements");
    const reqNeeded = Math.max(0, TARGETS.requirements - reqCount);
    let reqInserted = 0;
    for (let i = 0; i < requirementSeeds.length && reqInserted < reqNeeded; i += 1) {
      const seed = requirementSeeds[i];
      const user = users[i % users.length];
      const { rowCount } = await client.query(
        "SELECT 1 FROM requirements WHERE user_id = $1 AND requirement_text = $2 LIMIT 1",
        [user.id, seed.text]
      );
      if (rowCount === 0) {
        await client.query(
          `
          INSERT INTO requirements (user_id, requirement_text, category, status)
          VALUES ($1, $2, $3, $4)
          `,
          [user.id, seed.text, seed.category, seed.status]
        );
        reqInserted += 1;
        mark("requirements");
      }
    }

    const base = new Date();
    const { rows: appointmentCounts } = await client.query(
      "SELECT admin_id, COUNT(*)::int AS count FROM appointments GROUP BY admin_id"
    );
    const appointmentsByAdmin = new Map(
      appointmentCounts.map((row) => [row.admin_id, row.count])
    );
    const appointmentTypesByProfession = {
      astrology: ["Birth Chart", "Compatibility", "Career Guidance", "Remedial Session"],
      clinic: ["Consultation", "Follow-up", "Diagnostics Review", "Teleconsultation"],
      salon: ["Hair Spa", "Facial", "Manicure", "Bridal Trial"],
      restaurant: ["Table Booking", "Private Dining", "Chef's Table", "Catering Call"],
      shop: ["Product Demo", "Personal Shopping", "Delivery Setup", "Gift Wrap"],
      gym: ["Personal Training", "Assessment", "Nutrition Coaching", "Physio Session"],
      ecommerce: ["Product Consultation", "Subscription Setup", "Priority Support", "Fast Delivery"],
      default: ["Consultation", "Follow-up", "Session", "Workshop"],
    };

    for (let i = 0; i < admins.length; i += 1) {
      const admin = admins[i];
      const count = appointmentsByAdmin.get(admin.id) || 0;
      const needed = Math.max(0, APPOINTMENTS_PER_ADMIN - count);
      if (!needed) continue;
      const adminUsers =
        users.filter((row) => row.assigned_admin_id === admin.id) || [];
      const candidates = adminUsers.length ? adminUsers : users;
      const types =
        appointmentTypesByProfession[admin.profession] || appointmentTypesByProfession.default;

      for (let j = 0; j < needed; j += 1) {
        const user = candidates[(i + j) % candidates.length];
        const start = addDays(base, i * 2 + j + 1, 10 + (j % 5));
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const statusCycle = ["booked", "completed", "cancelled"];
        await client.query(
          `
          INSERT INTO appointments
            (user_id, admin_id, profession, appointment_type, start_time, end_time, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (admin_id, start_time) DO NOTHING
          `,
          [
            user.id,
            admin.id,
            admin.profession,
            types[j % types.length],
            start.toISOString(),
            end.toISOString(),
            statusCycle[(i + j) % statusCycle.length],
          ]
        );
        mark("appointments");
      }
    }

    const appointmentBasePrice = {
      astrology: 1200,
      clinic: 800,
      salon: 1100,
      restaurant: 1500,
      shop: 600,
      gym: 900,
      ecommerce: 700,
      default: 1000,
    };
    const { rows: appointments } = await client.query(
      "SELECT id, admin_id, profession FROM appointments ORDER BY id"
    );
    for (let i = 0; i < appointments.length; i += 1) {
      const appt = appointments[i];
      const total = appointmentBasePrice[appt.profession] || appointmentBasePrice.default;
      const { rowCount: billingExists } = await client.query(
        "SELECT 1 FROM appointment_billing WHERE appointment_id = $1 LIMIT 1",
        [appt.id]
      );
      if (billingExists === 0) {
        await client.query(
          `
          INSERT INTO appointment_billing (appointment_id, total_amount, currency, notes)
          VALUES ($1, $2, 'INR', $3)
          `,
          [appt.id, total, "Auto-generated billing"]
        );
      }

      const { rowCount: paymentExists } = await client.query(
        "SELECT 1 FROM appointment_payments WHERE appointment_id = $1 LIMIT 1",
        [appt.id]
      );
      if (paymentExists === 0) {
        const cycle = i % 3;
        if (cycle === 0) {
          await client.query(
            `
            INSERT INTO appointment_payments
              (appointment_id, amount, method, status, source, notes, paid_at)
            VALUES ($1, $2, 'upi', 'paid', 'seed', $3, NOW())
            `,
            [appt.id, total, "Paid in full"]
          );
        } else if (cycle === 1) {
          await client.query(
            `
            INSERT INTO appointment_payments
              (appointment_id, amount, method, status, source, notes, paid_at)
            VALUES ($1, $2, 'cash', 'paid', 'seed', $3, NOW())
            `,
            [appt.id, total * 0.5, "Partial payment"]
          );
        }
      }
    }

    const { rows: orderCounts } = await client.query(
      "SELECT admin_id, COUNT(*)::int AS count FROM orders GROUP BY admin_id"
    );
    const ordersByAdmin = new Map(orderCounts.map((row) => [row.admin_id, row.count]));

    for (let i = 0; i < admins.length; i += 1) {
      const admin = admins[i];
      const existingCount = ordersByAdmin.get(admin.id) || 0;
      const seeds = getDummyOrders(admin.id, admin.profession);
      if (!seeds.length || existingCount >= seeds.length) continue;

      for (let j = 0; j < seeds.length; j += 1) {
        const seed = seeds[j];
        const { rowCount: orderExists } = await client.query(
          "SELECT 1 FROM orders WHERE admin_id = $1 AND order_number = $2 LIMIT 1",
          [admin.id, seed.order_number]
        );
        if (orderExists > 0) continue;

        const { rows: orderRows } = await client.query(
          `
          INSERT INTO orders
            (admin_id, order_number, customer_name, customer_phone, customer_email, channel,
             status, fulfillment_status, delivery_method, delivery_address, currency,
             items, notes, assigned_to, placed_at, created_at)
          VALUES ($1, $2, $3, $4, $5, $6,
                  $7, $8, $9, $10, $11,
                  $12, $13, $14, $15, $16)
          RETURNING id
          `,
          [
            admin.id,
            seed.order_number,
            seed.customer_name,
            seed.customer_phone,
            seed.customer_email,
            seed.channel,
            seed.status,
            seed.fulfillment_status,
            seed.delivery_method,
            seed.delivery_address,
            seed.currency || "INR",
            JSON.stringify(seed.items || []),
            JSON.stringify(seed.notes || []),
            seed.assigned_to || admin.name,
            seed.placed_at,
            seed.created_at,
          ]
        );

        const orderId = orderRows?.[0]?.id;
        if (!orderId) continue;

        const totalAmount = Number(seed.total_amount || 0);
        await client.query(
          `
          INSERT INTO order_billing (order_id, total_amount, currency, notes)
          VALUES ($1, $2, $3, $4)
          `,
          [orderId, Number.isFinite(totalAmount) ? totalAmount : null, seed.currency || "INR", "Auto-generated billing"]
        );

        if (seed.payment_status === "paid") {
          const paymentA = Number.isFinite(totalAmount) ? totalAmount * (j % 4 === 1 ? 0.4 : 1) : 0;
          if (paymentA > 0) {
            await client.query(
              `
              INSERT INTO order_payments
                (order_id, amount, method, status, source, notes, paid_at)
              VALUES ($1, $2, $3, 'paid', 'seed', $4, NOW())
              `,
              [orderId, paymentA, "upi", paymentA < totalAmount ? "Partial payment" : "Paid in full"]
            );
          }
          if (paymentA > 0 && paymentA < totalAmount) {
            await client.query(
              `
              INSERT INTO order_payments
                (order_id, amount, method, status, source, notes, paid_at)
              VALUES ($1, $2, $3, 'paid', 'seed', $4, NOW())
              `,
              [orderId, totalAmount - paymentA, "card", "Balance payment"]
            );
          }
        } else if (seed.payment_status === "refunded") {
          await client.query(
            `
            INSERT INTO order_payments
              (order_id, amount, method, status, source, notes, paid_at)
            VALUES ($1, $2, $3, 'refunded', 'seed', $4, NOW())
            `,
            [orderId, Number.isFinite(totalAmount) ? totalAmount : 0, "card", "Refund processed"]
          );
        } else if (seed.payment_status === "pending" && Number.isFinite(totalAmount) && totalAmount > 0 && j % 3 === 1) {
          await client.query(
            `
            INSERT INTO order_payments
              (order_id, amount, method, status, source, notes, paid_at)
            VALUES ($1, $2, $3, 'paid', 'seed', $4, NOW())
            `,
            [orderId, totalAmount * 0.3, "cash", "Advance payment"]
          );
        }
      }
    }

    const needsCount = await getCount(client, "tasks");
    const needsNeeded = Math.max(0, TARGETS.needs - needsCount);
    let needsInserted = 0;
    for (let i = 0; i < needSeeds.length && needsInserted < needsNeeded; i += 1) {
      const seed = needSeeds[i];
      const user = users[i % users.length];
      const admin = admins[i % admins.length];
      const { rowCount } = await client.query(
        "SELECT 1 FROM tasks WHERE user_id = $1 AND need_text = $2 LIMIT 1",
        [user.id, seed.text]
      );
      if (rowCount === 0) {
        await client.query(
          `
          INSERT INTO tasks (user_id, need_text, priority, status, assigned_to)
          VALUES ($1, $2, $3, $4, $5)
          `,
          [user.id, seed.text, seed.priority, seed.status, admin.id]
        );
        needsInserted += 1;
        mark("needs");
      }
    }

    const broadcastCount = await getCount(client, "broadcasts");
    const broadcastNeeded = Math.max(0, TARGETS.broadcasts - broadcastCount);
    let broadcastInserted = 0;
    for (let i = 0; i < broadcastSeeds.length && broadcastInserted < broadcastNeeded; i += 1) {
      const seed = broadcastSeeds[i];
      const admin = admins[i % admins.length];
      const { rowCount } = await client.query(
        "SELECT 1 FROM broadcasts WHERE title = $1 LIMIT 1",
        [seed.title]
      );
      if (rowCount === 0) {
        const scheduled =
          seed.status === "scheduled"
            ? addDays(base, 2, 15).toISOString()
            : null;
        await client.query(
          `
          INSERT INTO broadcasts
            (title, message, target_audience_type, scheduled_at, status, sent_count, delivered_count, created_by)
          VALUES ($1, $2, 'all', $3, $4, $5, $6, $7)
          `,
          [
            seed.title,
            seed.message,
            scheduled,
            seed.status,
            seed.status === "sent" ? 120 : 0,
            seed.status === "sent" ? 110 : 0,
            admin.id,
          ]
        );
        broadcastInserted += 1;
        mark("broadcasts");
      }
    }

    const templateCount = await getCount(client, "templates");
    const templateNeeded = Math.max(0, TARGETS.templates - templateCount);
    let templateInserted = 0;
    for (let i = 0; i < templateSeeds.length && templateInserted < templateNeeded; i += 1) {
      const seed = templateSeeds[i];
      const admin = admins[i % admins.length];
      const { rowCount } = await client.query(
        "SELECT 1 FROM templates WHERE name = $1 LIMIT 1",
        [seed.name]
      );
      if (rowCount === 0) {
        await client.query(
          `
          INSERT INTO templates (name, category, content, variables_json, created_by)
          VALUES ($1, $2, $3, $4, $5)
          `,
          [seed.name, seed.category, seed.content, seed.variables_json, admin.id]
        );
        templateInserted += 1;
        mark("templates");
      }
    }

    for (let i = 0; i < admins.length; i += 1) {
      const admin = admins[i];
      const catalogConfig = getCatalogSeedsForProfession(admin.profession);
      const services = catalogConfig.services || [];
      const products = catalogConfig.products || [];
      const combined = [
        ...services.map((item, idx) => ({
          ...item,
          item_type: "service",
          is_bookable: true,
          sort_order: idx,
        })),
        ...products.map((item, idx) => ({
          ...item,
          item_type: "product",
          is_bookable: false,
          sort_order: idx,
        })),
      ];
      const limited = combined.slice(0, CATALOG_PER_ADMIN);

      for (const item of limited) {
        const { rowCount } = await client.query(
          "SELECT 1 FROM services_products WHERE admin_id = $1 AND item_type = $2 AND name = $3 LIMIT 1",
          [admin.id, item.item_type, item.name]
        );
        if (rowCount === 0) {
          await client.query(
            `
            INSERT INTO services_products
              (admin_id, item_type, name, category, description, price_label, duration_minutes, is_bookable, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `,
            [
              admin.id,
              item.item_type,
              item.name,
              item.category || null,
              item.description || null,
              item.price_label || null,
              item.duration_minutes || null,
              item.is_bookable,
              Number.isFinite(item.sort_order) ? item.sort_order : 0,
            ]
          );
          mark("catalog");
        }
      }
    }

    console.log("✅ Seed complete.", inserted);
  } finally {
    await client.end();
  }
}

console.log("🚀 Initializing database...");
initDatabase()
  .then(async () => {
    console.log("✅ Database initialized. Seeding dummy data...");
    await seedDatabase();
    console.log("✅ Dummy data seeded. Ready to start the app...");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Failed to initialize/seed:", err.message);
    process.exit(1);
  });

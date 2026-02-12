const CUSTOMER_SEEDS = [
  { name: "Aarav Rao", phone: "+91 91000 00001", email: "aarav@example.com", address: "12 MG Road, Bengaluru, Karnataka" },
  { name: "Diya Sen", phone: "+91 91000 00002", email: "diya@example.com", address: "Pickup at Koramangala Outlet" },
  { name: "Kabir Joshi", phone: "+91 91000 00003", email: "kabir@example.com", address: "Plot 8, Sector 21, Gurugram" },
  { name: "Nisha Verma", phone: "+91 91000 00004", email: "nisha@example.com", address: "24 Green Park, New Delhi" },
  { name: "Ritika Das", phone: "+91 91000 00005", email: "ritika@example.com", address: "88 Lake View, Pune" },
  { name: "Ishaan Kapoor", phone: "+91 91000 00006", email: "ishaan@example.com", address: "7/11 Heritage Street, Jaipur" },
  { name: "Maya Singh", phone: "+91 91000 00007", email: "maya@example.com", address: "45 Orchard Road, Mumbai" },
  { name: "Ravi Kumar", phone: "+91 91000 00008", email: "ravi@example.com", address: "19 Sunrise Avenue, Hyderabad" },
  { name: "Sara Ali", phone: "+91 91000 00009", email: "sara@example.com", address: "65 Palm Grove, Chennai" },
  { name: "Tanvi Shah", phone: "+91 91000 00010", email: "tanvi@example.com", address: "36 Palm Grove, Ahmedabad" },
];

const ORDER_ITEMS_BY_PROFESSION = {
  astrology: [
    { name: "Birth Chart Reading", price: 999 },
    { name: "Compatibility Match", price: 1199 },
    { name: "Personalized Report", price: 499 },
    { name: "Gemstone Guide", price: 299 },
    { name: "Annual Forecast", price: 1499 },
  ],
  clinic: [
    { name: "Initial Consultation", price: 699 },
    { name: "Diagnostics Review", price: 599 },
    { name: "Wellness Kit", price: 999 },
    { name: "Vitamin Pack", price: 799 },
    { name: "Teleconsultation", price: 399 },
  ],
  salon: [
    { name: "Hair Spa", price: 999 },
    { name: "Facial Treatment", price: 1199 },
    { name: "Manicure + Pedicure", price: 899 },
    { name: "Haircare Kit", price: 599 },
    { name: "Bridal Trial", price: 1999 },
  ],
  restaurant: [
    { name: "Family Meal Box", price: 899 },
    { name: "Party Pack", price: 1499 },
    { name: "Dessert Box", price: 499 },
    { name: "Chef's Special", price: 1299 },
    { name: "Gift Card", price: 999 },
  ],
  shop: [
    { name: "Starter Pack", price: 999 },
    { name: "Premium Bundle", price: 1999 },
    { name: "Accessories Kit", price: 599 },
    { name: "Seasonal Collection", price: 1499 },
    { name: "Gift Box", price: 799 },
  ],
  gym: [
    { name: "Personal Training Pack", price: 999 },
    { name: "Group Class Pass", price: 599 },
    { name: "Nutrition Plan", price: 699 },
    { name: "Protein Pack", price: 1299 },
    { name: "Recovery Kit", price: 999 },
  ],
  ecommerce: [
    { name: "Starter Bundle", price: 799 },
    { name: "Pro Kit", price: 1499 },
    { name: "Monthly Subscription", price: 999 },
    { name: "Accessories Pack", price: 599 },
    { name: "Gift Card", price: 499 },
  ],
  default: [
    { name: "Starter Pack", price: 799 },
    { name: "Premium Session", price: 999 },
    { name: "Gift Voucher", price: 499 },
    { name: "Monthly Planner", price: 199 },
    { name: "VIP Package", price: 1499 },
  ],
};

const ORDER_PREFIX = {
  astrology: "AST",
  clinic: "CLN",
  salon: "SLN",
  restaurant: "RST",
  shop: "SHP",
  gym: "GYM",
  ecommerce: "ECM",
  default: "GEN",
};

const buildOrderSeeds = (profession = "default") => {
  const itemsCatalog = ORDER_ITEMS_BY_PROFESSION[profession] || ORDER_ITEMS_BY_PROFESSION.default;
  const prefix = ORDER_PREFIX[profession] || ORDER_PREFIX.default;
  const statusCycle = [
    "new",
    "confirmed",
    "processing",
    "packed",
    "out_for_delivery",
    "fulfilled",
    "cancelled",
    "confirmed",
  ];
  const count = 8;
  const seeds = [];

  for (let i = 0; i < count; i += 1) {
    const customer = CUSTOMER_SEEDS[i % CUSTOMER_SEEDS.length];
    const status = statusCycle[i % statusCycle.length];
    let payment_status = "pending";
    let fulfillment_status = "unfulfilled";

    if (status === "cancelled") {
      payment_status = "refunded";
      fulfillment_status = "cancelled";
    } else if (status === "fulfilled") {
      payment_status = "paid";
      fulfillment_status = "delivered";
    } else if (status === "out_for_delivery") {
      payment_status = "paid";
      fulfillment_status = "shipped";
    } else if (status === "packed" || status === "processing") {
      payment_status = "paid";
      fulfillment_status = "packed";
    } else if (status === "confirmed") {
      payment_status = "paid";
      fulfillment_status = "unfulfilled";
    }

    const itemA = itemsCatalog[i % itemsCatalog.length];
    const itemB = itemsCatalog[(i + 2) % itemsCatalog.length];
    const items = i % 2 === 0
      ? [{ ...itemA, quantity: 1 }]
      : [{ ...itemA, quantity: 1 }, { ...itemB, quantity: 1 }];

    const notes = [];
    if (status === "packed") {
      notes.push({ message: "Packing completed. Awaiting pickup.", author: "Ops", offset_hours: 2 });
    }
    if (status === "confirmed") {
      notes.push({ message: "Payment received, preparing schedule.", author: "Finance", offset_hours: 6 });
    }
    if (status === "cancelled") {
      notes.push({ message: "Customer cancelled due to schedule conflict.", author: "Support", offset_hours: 3 });
    }

    seeds.push({
      order_number: `${prefix}-${1000 + i + 1}`,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email,
      channel: "WhatsApp",
      status,
      payment_status,
      fulfillment_status,
      delivery_method: i % 2 === 0 ? "Delivery" : "Pickup",
      delivery_address: customer.address,
      age_days: i + 1,
      age_hours: (i * 2) % 12,
      items,
      notes,
    });
  }

  return seeds;
};

const buildDate = (now, days, hours) => {
  const date = new Date(now.getTime());
  date.setDate(date.getDate() - Number(days || 0));
  date.setHours(date.getHours() - Number(hours || 0));
  return date;
};

const computeTotal = (items = []) =>
  items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);

export const getDummyOrders = (adminId, profession = "default") => {
  const now = new Date();
  const seeds = buildOrderSeeds(profession);
  return seeds.map((seed, index) => {
    const createdAt = buildDate(now, seed.age_days, seed.age_hours);
    const notes = (seed.notes || []).map((note, idx) => ({
      id: `${seed.order_number}-note-${idx + 1}`,
      message: note.message,
      author: note.author,
      created_at: buildDate(createdAt, 0, note.offset_hours || 0).toISOString(),
    }));
    const items = seed.items || [];
    return {
      id: `${adminId || "demo"}-${seed.order_number}-${index + 1}`,
      admin_id: adminId || null,
      order_number: seed.order_number,
      customer_name: seed.customer_name,
      customer_phone: seed.customer_phone,
      customer_email: seed.customer_email,
      channel: seed.channel,
      status: seed.status,
      payment_status: seed.payment_status,
      fulfillment_status: seed.fulfillment_status,
      delivery_method: seed.delivery_method,
      delivery_address: seed.delivery_address,
      currency: "INR",
      total_amount: computeTotal(items),
      items,
      notes,
      assigned_to: adminId ? `Admin #${adminId}` : "Admin Team",
      created_at: createdAt.toISOString(),
      placed_at: createdAt.toISOString(),
    };
  });
};

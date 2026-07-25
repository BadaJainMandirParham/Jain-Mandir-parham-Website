import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDonationRecipientEmail } from "./donationEmail.js";
import { matchesCommitteeIdentity, verifyCommitteePassword } from "./committeeAuth.js";
import { isCommitteeContentTable, shouldUseLocalContentWrite } from "./contentRouting.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const uploadDir = path.join(rootDir, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const app = express();
const port = process.env.PORT || 5000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
const backendUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
const jwtSecret = process.env.JWT_SECRET || "dev_secret_change_me";
const appContentApiBaseUrl = (process.env.APP_CONTENT_API_BASE_URL || "https://bada-jain-mandir-app-1357.onrender.com/api").replace(/\/$/, "");
const appContentAdminToken = process.env.APP_CONTENT_ADMIN_TOKEN || "";
const appContentRoutes = {
  gallery: "gallery",
  projects: "projects",
  recent_work: "recent-work",
  committee: "committee",
  committee_public: "committee",
  events: "events",
};
const appContentTables = new Set(Object.keys(appContentRoutes));
const razorpayCheckoutCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
  "script-src-elem 'self' 'unsafe-inline' https://checkout.razorpay.com",
  "connect-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://lumberjack.razorpay.com",
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https:",
].join("; ");
const origins = (process.env.CORS_ORIGINS || frontendUrl)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
      connectSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com", "https://lumberjack.razorpay.com"],
      frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
      imgSrc: ["'self'", "data:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
    },
  },
}));
app.use(cors({ origin: origins.length ? origins : true, credentials: true }));
app.use(morgan("dev"));
app.use("/uploads", express.static(uploadDir));

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

app.put("/uploads/signed/:bucket/:fileName", express.raw({ type: "*/*", limit: "20mb" }), (req, res) => {
  const bucketDir = path.join(uploadDir, req.params.bucket);
  fs.mkdirSync(bucketDir, { recursive: true });
  fs.writeFileSync(path.join(bucketDir, req.params.fileName), req.body);
  res.json({ ok: true });
});

app.use(express.json({ limit: "5mb" }));

mongoose.set("strictQuery", false);

const looseOptions = {
  strict: false,
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  versionKey: false,
};

const User = mongoose.model("User", new mongoose.Schema({
  email: { type: String, unique: true, index: true, required: true },
  password_hash: { type: String, required: true },
  user_metadata: { type: Object, default: {} },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
}, looseOptions), "users");

const models = new Map();
const modelFor = (table) => {
  const collection = table === "committee_public" ? "committee" : table;
  if (!models.has(collection)) {
    models.set(collection, mongoose.model(collection, new mongoose.Schema({}, looseOptions), collection));
  }
  return models.get(collection);
};

const normalize = (doc) => {
  if (!doc) return null;
  const item = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const id = String(item._id || item.id);
  delete item.__v;
  return { ...item, _id: id, id };
};

const safeFileName = (name) => `${Date.now()}-${String(name).replace(/[^a-zA-Z0-9._-]/g, "_")}`;

const createReceiptId = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const unique = String(Math.floor(100000 + Math.random() * 900000));
  return `BJMP-${yyyy}${mm}${dd}-${unique}`;
};

const stripHtmlToText = (html) => String(html || "")
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+\n/g, "\n")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const createReceiptPdfBuffer = async (html, receiptId) => {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const lines = stripHtmlToText(html).split(/\n/).map((line) => line.trim()).filter(Boolean);
  const displayLines = lines.slice(0, 45);
  page.drawText(`Receipt: ${receiptId}`, { x: 50, y: 780, size: 16, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  let y = 750;
  for (const line of displayLines) {
    page.drawText(line, { x: 50, y, size: 10, font, color: rgb(0.12, 0.12, 0.12) });
    y -= 14;
    if (y < 60) break;
  }
  return Buffer.from(await doc.save());
};

const signUser = (user) => jwt.sign({ sub: String(user._id), email: user.email }, jwtSecret, { expiresIn: "7d" });
const signCommittee = (member) => jwt.sign({ sub: String(member._id), type: "committee" }, jwtSecret, { expiresIn: "7d" });
const verifyResetTokenPayload = (token) => {
  if (!token) return null;
  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }
};

const regexEscape = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const attachDonationsToUser = async (user) => {
  if (!user?.email) return;
  const Donation = modelFor("donations");
  const normalizedEmail = String(user.email).toLowerCase();
  await Donation.updateMany({
    $and: [
      {
        $or: [
          { user_id: { $exists: false } },
          { user_id: null },
          { user_id: "" },
        ],
      },
      {
        $or: [
          { donor_email: { $regex: `^${regexEscape(normalizedEmail)}$`, $options: "i" } },
          { email: { $regex: `^${regexEscape(normalizedEmail)}$`, $options: "i" } },
        ],
      },
    ],
  }, { $set: { user_id: String(user._id) } });
};

const auth = async (req, _res, next) => {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return next();
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (payload.type === "committee") {
      const member = await modelFor("committee").findById(payload.sub);
      req.user = member ? normalize(member) : null;
      req.authType = "committee";
    } else {
      req.user = await User.findById(payload.sub);
      req.authType = "user";
    }
  } catch {
    req.user = null;
    req.authType = "anonymous";
  }
  next();
};

app.use(auth);

const hasCloudinaryConfig = Boolean(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);

if (hasCloudinaryConfig) {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
}

const requireUser = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  next();
};

const isAdmin = async (userId) => {
  const Role = modelFor("user_roles");
  return Boolean(await Role.findOne({ user_id: String(userId), role: "admin" }));
};

const requireAdmin = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if (!(await isAdmin(req.user._id))) return res.status(403).json({ error: "Admin role required" });
  next();
};

const requireAdminOrCommittee = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if (req.authType === "committee") return next();
  if (!(await isAdmin(req.user._id))) return res.status(403).json({ error: "Admin role required" });
  next();
};

const requireTableWriteAccess = async (req, res, next) => {
  if (req.method === "POST" && req.params.table === "contact_messages") return next();
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if (req.params.table === "event_bookmarks") return next();
  if (req.params.table === "profiles") {
    const body = req.body || {};
    const requestedUserId = req.query.user_id || body.user_id || body.id || body._id;
    if (requestedUserId && String(requestedUserId) === String(req.user._id)) return next();
  }
  if (!(await isAdmin(req.user._id))) return res.status(403).json({ error: "Admin role required" });
  next();
};

const applyTableReadAccess = async (req, res) => {
  const table = req.params.table;
  if (!["profiles", "user_roles", "donations", "event_bookmarks", "contact_messages"].includes(table)) return true;
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  const admin = await isAdmin(req.user._id);
  if (admin) return true;
  if (table === "contact_messages") {
    res.status(403).json({ error: "Admin role required" });
    return false;
  }
  req.query.user_id = String(req.user._id);
  return true;
};

const verifyCommitteeToken = async (token) => {
  const payload = jwt.verify(token, jwtSecret);
  if (payload.type !== "committee") throw new Error("Invalid committee session");
  return modelFor("committee").findById(payload.sub);
};

const buildFilter = (query) => {
  const reserved = new Set(["order", "ascending", "limit", "single", "count", "head", "or"]);
  const filter = {};
  for (const [key, value] of Object.entries(query)) {
    if (reserved.has(key)) continue;
    filter[key === "id" ? "_id" : key] = value;
  }
  if (query.or) {
    filter.$or = String(query.or).split(",").map((part) => {
      const [field, operator, ...rest] = part.split(".");
      return operator === "eq" ? { [field]: rest.join(".") } : {};
    });
  }
  return filter;
};

const appendQuery = (url, query) => {
  const target = new URL(url);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) target.searchParams.set(key, String(value));
  }
  return target.toString();
};

const toWebsiteContentShape = (table, item) => {
  const row = normalize(item);
  if (table === "gallery") {
    row.url = row.url || row.image_url;
    row.type = row.type || "photo";
  }
  if (table === "projects" || table === "recent_work") {
    row.image_url = row.image_url || row.url;
    row.video_url = row.video_url || row.youtube_url;
    if (row.status === "ongoing") row.status = "under_construction";
  }
  if (table === "events") {
    row.title = row.title || row.event_name;
    row.event_name = row.event_name || row.title;
    row.event_date = row.event_date || row.date;
    row.start_time = row.start_time || row.time;
  }
  if (table === "committee_public") {
    delete row.password;
    delete row.password_hash;
  }
  if (row.app_id) row.id = String(row.app_id);
  return row;
};

const fromWebsiteContentShape = (table, body = {}) => {
  const data = { ...body };
  delete data.id;
  delete data._id;
  if (table === "gallery") {
    data.image_url = data.image_url || data.url;
  }
  if (table === "projects" || table === "recent_work") {
    data.image_url = data.image_url || data.url;
    data.youtube_url = data.youtube_url || data.video_url;
    if (data.status === "under_construction") data.status = "ongoing";
  }
  if (table === "events") {
    data.title = data.title || data.event_name;
    data.event_name = data.event_name || data.title;
    data.date = data.date || data.event_date;
    data.event_date = data.event_date || data.date;
    data.time = data.time || data.start_time;
    data.start_time = data.start_time || data.time;
  }
  if (["gallery", "projects", "recent_work", "committee"].includes(table) && data.image_url && !data.image_data) {
    data.image_data = data.image_url;
  }
  return data;
};

const applyWebsiteQueryToRows = (rows, query, table) => {
  let data = rows.map((item) => toWebsiteContentShape(table, item));
  for (const [key, value] of Object.entries(query)) {
    if (["order", "ascending", "limit", "single", "count", "head", "or"].includes(key)) continue;
    data = data.filter((item) => String(item[key === "id" ? "id" : key] ?? "") === String(value));
  }
  if (query.or) {
    const clauses = String(query.or).split(",").map((part) => {
      const [field, operator, ...rest] = part.split(".");
      return operator === "eq" ? { field, value: rest.join(".") } : null;
    }).filter(Boolean);
    if (clauses.length) {
      data = data.filter((item) => clauses.some((clause) => String(item[clause.field] ?? "") === String(clause.value)));
    }
  }
  if (query.order) {
    const dir = query.ascending === "false" ? -1 : 1;
    data.sort((a, b) => String(a[query.order] ?? "").localeCompare(String(b[query.order] ?? "")) * dir);
  }
  if (query.limit) data = data.slice(0, Number(query.limit));
  return data;
};

const localContentRows = async (table) => {
  const collection = table === "committee_public" ? "committee" : table;
  return modelFor(collection).find().lean();
};

const mergeRemoteAndLocalContent = (table, remoteRows, localRows) => {
  const merged = new Map();
  remoteRows.forEach((row) => {
    const shaped = toWebsiteContentShape(table, row);
    merged.set(String(shaped.id), shaped);
  });
  localRows.forEach((row) => {
    const key = String(row.app_id || row._id || row.id);
    if (row._deleted) {
      merged.delete(key);
      return;
    }
    merged.set(key, toWebsiteContentShape(table, row));
  });
  return [...merged.values()];
};

const saveLocalContentWrite = async (req, res) => {
  const table = req.params.table === "committee_public" ? "committee" : req.params.table;
  const Model = modelFor(table);
  const id = req.body?.id || req.body?._id || req.query.id;
  if (req.method === "DELETE") {
    if (!id) return res.status(400).json({ error: "Item id is required" });
    const filter = { $or: [{ _id: mongoose.isValidObjectId(id) ? id : undefined }, { id }, { app_id: id }].filter((item) => Object.values(item)[0]) };
    const result = await Model.deleteMany(filter);
    return res.json({ data: null, count: result.deletedCount || 0 });
  }
  const data = fromWebsiteContentShape(table, req.body || {});
  if (isCommitteeContentTable(req.params.table)) {
    const passwordCandidate = data.password_hash || data.password;
    if (!passwordCandidate) {
      const phoneValue = String(data.phone || data.mobile || data.mobile_number || data.phone_number || "").trim();
      data.password_hash = await bcrypt.hash(phoneValue || "123456", 12);
    }
    delete data.password;
  }
  data.updated_at = new Date();
  if (id) {
    data.app_id = id;
    const filter = { $or: [{ _id: mongoose.isValidObjectId(id) ? id : undefined }, { id }, { app_id: id }].filter((item) => Object.values(item)[0]) };
    const doc = await Model.findOneAndUpdate(filter, { $set: data }, { new: true, upsert: true });
    return res.json({ data: toWebsiteContentShape(req.params.table, doc) });
  }
  data.created_at = data.created_at || new Date();
  const doc = await Model.create(data);
  return res.status(201).json({ data: toWebsiteContentShape(req.params.table, doc) });
};

const proxyContentTable = async (req, res) => {
  const nativeRoute = appContentRoutes[req.params.table];
  const isWrite = req.method !== "GET";
  const id = req.body?.id || req.body?._id || req.query.id;
  if (isWrite && shouldUseLocalContentWrite(req.params.table, Boolean(appContentAdminToken))) return saveLocalContentWrite(req, res);
  if (isWrite && !appContentAdminToken) return saveLocalContentWrite(req, res);
  if (isCommitteeContentTable(req.params.table) && !isWrite) {
    const collection = req.params.table === "committee_public" ? "committee" : req.params.table;
    const rows = await modelFor(collection).find().lean();
    const data = applyWebsiteQueryToRows(rows.map((row) => toWebsiteContentShape(req.params.table, row)), req.query, req.params.table);
    if (req.query.count === "true" && req.query.head === "true") return res.json({ data: null, count: data.length });
    return res.json({ data: req.query.single === "true" ? data[0] || null : data, count: data.length });
  }
  let url = `${appContentApiBaseUrl}/${nativeRoute}`;
  if (isWrite && id && ["PUT", "PATCH", "DELETE"].includes(req.method)) url += `/${id}`;
  if (!isWrite && req.query.order) {
    url = appendQuery(url, { sort: req.query.ascending === "false" ? `-${req.query.order}` : req.query.order });
  }
  const headers = { Accept: "application/json" };
  if (isWrite) {
    headers.Authorization = `Bearer ${appContentAdminToken}`;
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(url, {
    method: req.method === "PATCH" ? "PUT" : req.method,
    headers,
    body: isWrite && req.method !== "DELETE" ? JSON.stringify(fromWebsiteContentShape(req.params.table, req.body || {})) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return res.status(response.status).json(payload);
  if (!isWrite) {
    const rows = Array.isArray(payload) ? payload : payload.data || [];
    const localRows = await localContentRows(req.params.table);
    const data = applyWebsiteQueryToRows(mergeRemoteAndLocalContent(req.params.table, rows, localRows), req.query, req.params.table);
    if (req.query.count === "true" && req.query.head === "true") return res.json({ data: null, count: data.length });
    return res.json({ data: req.query.single === "true" ? data[0] || null : data, count: data.length });
  }
  return res.status(response.status).json({ data: toWebsiteContentShape(req.params.table, payload.data || payload) });
};

const proxyAppFunction = async (name, body, headers = {}) => {
  const response = await fetch(`${appContentApiBaseUrl}/functions/${name}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body || {}),
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
};

const verifyPaymentSignature = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  if (process.env.NODE_ENV !== "production" && String(razorpay_order_id || "").startsWith("order_mock_")) return true;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  const actual = String(razorpay_signature || "");
  return expected.length === actual.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
};

const createRazorpayOrder = async ({ amount, receipt }) => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    if (process.env.NODE_ENV !== "production") {
      return {
        id: `order_mock_${Date.now()}`,
        amount: Math.round(Number(amount) * 100),
        currency: process.env.DONATION_CURRENCY || "INR",
        receipt,
      };
    }
    throw new Error("Razorpay is not configured");
  }
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(Number(amount) * 100),
      currency: process.env.DONATION_CURRENCY || "INR",
      receipt,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.description || "Unable to create Razorpay order");
  return payload;
};

const redactCommittee = (rows) => rows.map((row) => {
  const item = normalize(row);
  delete item.password;
  delete item.password_hash;
  delete item.email;
  return item;
});

const mailTransport = () => {
  const provider = process.env.EMAIL_PROVIDER || "auto";
  if ((provider === "gmail" || provider === "auto") && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  if ((provider === "resend" || provider === "auto") && process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 587,
      secure: false,
      auth: { user: "resend", pass: process.env.RESEND_API_KEY },
    });
  }
  return null;
};

const logoUrl = process.env.LOGO_URL || `${frontendUrl.replace(/\/$/, "")}/favicon.png`;
const receiptLogoDataUri = (() => {
  try {
    const logoPath = path.join(rootDir, "..", "frontend", "src", "assets", "temple-logo.png");
    const buffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
})();
const getReceiptLogoSrc = () => receiptLogoDataUri || logoUrl;
const appDownloadUrl = process.env.APP_DOWNLOAD_URL || "https://www.indusappstore.com/apps/devotional/bada-jain-mandir-parham/com.parham.jainmandir/?page=details&id=com.parham.jainmandir";
const websiteUrl = frontendUrl.replace(/\/$/, "");
const websiteSourceText = `This is an automated email sent through the official website: ${websiteUrl}`;
const developerSignature = "ARPAN JAIN";
const authorizedSignatureHtml = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
<tr><td style="padding-top:18px;color:#1f2937;font-size:13px;line-height:1.65;">
<div style="font-family:monospace;color:#374151;letter-spacing:.5px;">__________________________________</div>
<div style="margin-top:6px;color:#6b7280;">Authorized Signatory</div>
<div style="margin-top:12px;font-weight:800;color:#111827;letter-spacing:.6px;">ARPAN JAIN</div>
<div style="color:#374151;">Head – IT &amp; Media</div>
<div style="color:#374151;">(Web &amp; App Development)</div>
</td></tr>
</table>`;

const committeeCredentialsHtml = ({ name = "Committee Member", position = "Committee Member", phone = "" }) => {
  const phone10 = String(phone || "").replace(/\D/g, "").slice(-10);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Tahoma,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);">
<tr><td style="padding:32px 24px 16px;text-align:center;border-bottom:1px solid #e5e7eb;">
<img src="${logoUrl}" alt="Logo" width="56" height="56" style="border-radius:50%;margin:0 auto 12px;display:block" />
<h1 style="margin:0;font-size:20px;color:#1f2937;font-weight:700;">Shri Parshwanath Digambar Bada Jain Mandir, Parham</h1>
<p style="margin:6px 0 0;font-size:13px;color:#6b7280;">Jai Jinendra</p>
</td></tr>
<tr><td style="padding:24px 28px 0;">
<p style="margin:0;font-size:15px;color:#1f2937;">Dear <strong>${name}</strong>,</p>
<p style="margin:8px 0 0;font-size:14px;color:#374151;line-height:1.7;">Welcome! You have been added as a <strong>Committee Member</strong> (${position}) on our temple's official website. Below are your login credentials and instructions.</p>
</td></tr>
<tr><td style="padding:20px 28px;"><table width="100%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;"><tr><td style="padding:20px;">
<p style="margin:0 0 6px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;font-weight:600;">Your Login Credentials</p>
<table width="100%" style="font-size:14px;color:#1f2937;">
<tr><td style="padding:6px 0;width:120px;color:#6b7280;">Name:</td><td style="padding:6px 0;font-weight:600;">${name}</td></tr>
<tr><td style="padding:6px 0;color:#6b7280;">Position:</td><td style="padding:6px 0;font-weight:600;">${position}</td></tr>
<tr><td style="padding:6px 0;color:#6b7280;">Password:</td><td style="padding:6px 0;"><code style="background:#fef3c7;border:1px solid #fcd34d;padding:4px 12px;border-radius:6px;font-size:16px;font-weight:700;color:#92400e;letter-spacing:1px;">${phone10}</code></td></tr>
</table>
<p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">Your registered mobile number is used as the default password.</p>
</td></tr></table></td></tr>
<tr><td style="padding:0 28px 20px;text-align:center;">
<a href="${frontendUrl}" style="display:inline-block;background:#1f2937;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;margin:4px;">Visit Website</a>
<a href="${frontendUrl.replace(/\/$/, "")}/login" style="display:inline-block;background:#b8860b;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;margin:4px;">Login Now</a>
</td></tr>
<tr><td style="padding:0 28px 20px;"><table width="100%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;"><tr><td style="padding:18px;">
<p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#166534;">How to Login (Step by Step)</p>
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#374151;line-height:1.8;">
<tr><td style="padding:2px 0;">1. Go to <a href="${frontendUrl.replace(/\/$/, "")}/login" style="color:#b8860b;font-weight:600;">${frontendUrl.replace(/\/$/, "")}/login</a></td></tr>
<tr><td style="padding:2px 0;">2. Select role: <strong>Committee</strong></td></tr>
<tr><td style="padding:2px 0;">3. Select your <strong>Position</strong> from the dropdown</td></tr>
<tr><td style="padding:2px 0;">4. Select your <strong>Name</strong></td></tr>
<tr><td style="padding:2px 0;">5. Enter your <strong>Mobile Number</strong> as password</td></tr>
<tr><td style="padding:2px 0;">6. Click the <strong>Login</strong> button</td></tr>
</table>
</td></tr></table></td></tr>
<tr><td style="padding:0 28px 24px;"><table width="100%" style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;"><tr><td style="padding:16px 18px;">
<p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#991b1b;">Important Security Notice</p>
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#7f1d1d;line-height:1.7;">
<tr><td style="padding:2px 0;"><strong>Change your password immediately</strong> after your first login for security.</td></tr>
<tr><td style="padding:2px 0;">Go to <strong>Settings - Change Password</strong> after logging in.</td></tr>
<tr><td style="padding:2px 0;">Forgot your password? Click <strong>Forgot Password</strong> on the login page to reset it.</td></tr>
<tr><td style="padding:2px 0;"><strong>Do not share</strong> your login credentials with anyone.</td></tr>
</table>
</td></tr></table></td></tr>
<tr><td style="background:#1f2937;padding:20px 28px;text-align:center;">
<p style="margin:0;color:#d1d5db;font-size:12px;">${websiteSourceText}</p>
<p style="margin:6px 0 0;color:#9ca3af;font-size:11px;">© ${new Date().getFullYear()} · Developed by <span style="color:#fbbf24;">${developerSignature}</span></p>
</td></tr></table></td></tr></table></body></html>`;
};

const welcomeHtml = (name = "Devotee") => `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f6f1e7;font-family:'Segoe UI',Tahoma,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e7;padding:40px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(184,134,11,.15);border:1px solid #f0e0b6;">
<tr><td style="background:linear-gradient(135deg,#b8860b 0%,#daa520 50%,#b8860b 100%);padding:32px 24px;text-align:center;">
<img src="${logoUrl}" alt="Mandir" width="72" height="72" style="border-radius:50%;background:#fff;padding:6px;margin-bottom:12px;" />
<h1 style="margin:0;font-size:22px;color:#fff;font-weight:700;">Jai Jinendra</h1>
<p style="margin:6px 0 0;font-size:14px;color:#fff8dc;">Shri Parshwanath Digambar Bada Jain Mandir, Parham</p>
</td></tr>
<tr><td style="padding:28px 32px 8px;color:#374151;line-height:1.75;font-size:15px;">
<p style="margin:0;font-size:17px;color:#1f2937;">Dear <strong style="color:#b8860b;">${name}</strong>,</p>
<p>Aap sabhi ka humare mandir parivar mein hardik swagat hai! Bhagwan Parshwanath ki kripa aap par sada bani rahe, aur aapke jeevan mein sukh, shanti aur samriddhi ka vaas ho.</p>
<p>Hum aapko yaad dilana chahte hain ki humari official website par aap darshan, events, donations aur live darshan sabhi kuch aasani se dekh sakte hain.</p>
<p style="background:#fffdf5;border:1px solid #f0e0b6;border-radius:10px;padding:12px 14px;margin:16px 0 0;color:#78350f;"><strong>Website Source:</strong> Yeh automated email mandir ki official website ke through bheja gaya hai - <a href="${websiteUrl}" style="color:#b8860b;font-weight:700;">${websiteUrl}</a></p>
</td></tr>
<tr><td style="padding:16px 32px;"><table width="100%" style="background:linear-gradient(135deg,#fff8dc 0%,#fef3c7 100%);border:2px solid #daa520;border-radius:12px;"><tr><td style="padding:22px;text-align:center;">
<h2 style="margin:0 0 6px;font-size:19px;color:#92400e;font-weight:700;">Mandir App Ab Available Hai!</h2>
<p style="margin:0 0 16px;font-size:14px;color:#78350f;line-height:1.6;">Indus App Store par official app download karein aur mandir updates mobile par paayein.</p>
<a href="${appDownloadUrl}" style="display:inline-block;background:linear-gradient(135deg,#b8860b,#daa520);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">Download Now on Indus App Store</a>
<p style="margin:12px 0 0;font-size:12px;color:#92400e;">Click karte hi aap seedha app page par pahunch jayenge.</p>
</td></tr></table></td></tr>
<tr><td style="padding:8px 32px 20px;"><table width="100%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;"><tr><td style="padding:20px;">
<h3 style="margin:0 0 12px;font-size:15px;color:#166534;font-weight:700;">App Install Karne Ke Baad Ke Steps:</h3>
<table cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;line-height:1.9;">
<tr><td style="vertical-align:top;padding-right:10px;color:#166534;font-weight:700;">1.</td><td>App install hote hi <strong>apna account create karein</strong> naam aur mobile number ke sath.</td></tr>
<tr><td style="vertical-align:top;padding-right:10px;color:#166534;font-weight:700;">2.</td><td><strong>Notification permission Allow</strong> karein taaki mandir ke aarti, events aur pravachan ki suchna samay par mile.</td></tr>
<tr><td style="vertical-align:top;padding-right:10px;color:#166534;font-weight:700;">3.</td><td>Live darshan, donations aur gallery ka aanand lein - sab kuch ek hi jagah.</td></tr>
</table>
</td></tr></table></td></tr>
<tr><td style="padding:0 32px 20px;text-align:center;">
<a href="${websiteUrl}" style="display:inline-block;background:#1f2937;color:#fff;text-decoration:none;padding:11px 26px;border-radius:8px;font-size:13px;font-weight:600;margin:4px;">Visit Website</a>
<a href="${appDownloadUrl}" style="display:inline-block;background:#b8860b;color:#fff;text-decoration:none;padding:11px 26px;border-radius:8px;font-size:13px;font-weight:600;margin:4px;">Get the App</a>
</td></tr>
<tr><td style="padding:0 32px 24px;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#fffdf5;border:1px solid #f0e0b6;border-radius:12px;"><tr><td style="padding:18px 20px;">
<h3 style="margin:0 0 12px;font-size:14px;color:#92400e;font-weight:700;letter-spacing:.3px;">Sampark / Contact</h3>
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="50%" style="padding:4px 6px 4px 0;"><a href="mailto:badajainmandirparham@gmail.com" style="display:block;background:linear-gradient(135deg,#fff8dc,#fef3c7);border:1px solid #daa520;color:#78350f;text-decoration:none;padding:12px 14px;border-radius:10px;font-size:12px;font-weight:600;text-align:center;">Support<br><span style="font-size:11px;font-weight:500;color:#92400e;word-break:break-all;">badajainmandirparham@gmail.com</span></a></td>
<td width="50%" style="padding:4px 0 4px 6px;"><a href="tel:+916399003541" style="display:block;background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:1px solid #6366f1;color:#312e81;text-decoration:none;padding:12px 14px;border-radius:10px;font-size:12px;font-weight:600;text-align:center;">Developer<br><span style="font-size:11px;font-weight:500;color:#4338ca;">Arpan Jain - +91 6399003541</span></a></td>
</tr></table>
</td></tr></table></td></tr>
<tr><td style="background:#1f2937;padding:22px 28px;text-align:center;">
<p style="margin:0;color:#fbbf24;font-size:13px;font-weight:600;">Bhagwan Parshwanath ki kripa aap par bani rahe</p>
<p style="margin:8px 0 0;color:#d1d5db;font-size:11px;">${websiteSourceText}</p>
<p style="margin:4px 0 0;color:#d1d5db;font-size:11px;">Shri Parshwanath Digambar Bada Jain Mandir, Parham, Uttar Pradesh</p>
<p style="margin:4px 0 0;color:#9ca3af;font-size:10px;">© ${new Date().getFullYear()} All rights reserved · Developed by <span style="color:#fbbf24;">${developerSignature}</span></p>
</td></tr></table></td></tr></table></body></html>`;

const resetPasswordEmailHtml = (name = "Devotee", link = "") => `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f6f1e7;font-family:'Segoe UI',Tahoma,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e7;padding:40px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;border:1px solid #f0e0b6;box-shadow:0 4px 20px rgba(184,134,11,.12);">
<tr><td style="background:linear-gradient(135deg,#b8860b 0%,#daa520 100%);padding:28px 24px;text-align:center;color:#fff;">
<h1 style="margin:0;font-size:22px;">Reset Your Password</h1>
<p style="margin:8px 0 0;font-size:14px;opacity:.95;">Shri Parshwanath Digambar Bada Jain Mandir, Parham</p>
</td></tr>
<tr><td style="padding:28px 32px;color:#374151;font-size:15px;line-height:1.8;">
<p style="margin:0 0 10px;">Dear <strong>${name}</strong>,</p>
<p style="margin:0 0 14px;">We received a request to reset the password for your account. To continue, please open the secure link below. This link is valid for 1 hour.</p>
<p style="margin:0 0 16px;"><a href="${link}" style="display:inline-block;background:#b8860b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;">Reset Password</a></p>
<p style="margin:0 0 10px;font-size:13px;color:#6b7280;">If the button above does not work, copy and paste this link into your browser:</p>
<p style="margin:0 0 16px;word-break:break-all;font-size:13px;color:#1f2937;"><a href="${link}" style="color:#b8860b;">${link}</a></p>
<p style="margin:0 0 0;font-size:13px;color:#6b7280;">If you did not request this change, you can ignore this email and your password will remain unchanged.</p>
</td></tr>
<tr><td style="background:#1f2937;padding:20px 28px;text-align:center;color:#d1d5db;font-size:12px;line-height:1.6;">${websiteSourceText}</td></tr>
</table></td></tr></table></body></html>`;

const donationReceiptHtml = (donation, receiptId) => `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f6f1e7;font-family:'Segoe UI',Tahoma,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e7;padding:36px 16px;"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;border:1px solid #f0e0b6;">
<tr><td style="background:#b8860b;color:#fff;padding:26px;text-align:center;"><h1 style="margin:0;font-size:22px;">Donation Receipt</h1><p style="margin:6px 0 0;">Shri Parshwanath Digambar Bada Jain Mandir, Parham</p></td></tr>
<tr><td style="padding:24px 30px;color:#1f2937;font-size:14px;line-height:1.8;">
<p>Jai Jinendra <strong>${donation.donor_name || donation.name || "Devotee"}</strong>,</p>
<p>Thank you for your donation. Your contribution has been received successfully.</p>
<table width="100%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px;">
<tr><td style="padding:8px 0;color:#6b7280;">Receipt No.</td><td style="padding:8px 0;font-weight:700;">${receiptId}</td></tr>
<tr><td style="padding:8px 0;color:#6b7280;">Amount</td><td style="padding:8px 0;font-weight:700;">${donation.currency || "INR"} ${donation.amount}</td></tr>
<tr><td style="padding:8px 0;color:#6b7280;">Purpose</td><td style="padding:8px 0;font-weight:600;">${donation.purpose || "General Donation"}</td></tr>
<tr><td style="padding:8px 0;color:#6b7280;">Donor</td><td style="padding:8px 0;font-weight:600;">${donation.donor_name || donation.name || "Devotee"}</td></tr>
<tr><td style="padding:8px 0;color:#6b7280;">Email</td><td style="padding:8px 0;font-weight:600;">${donation.donor_email || donation.email || ""}</td></tr>
<tr><td style="padding:8px 0;color:#6b7280;">Phone</td><td style="padding:8px 0;font-weight:600;">${donation.donor_phone || donation.phone || ""}</td></tr>
<tr><td style="padding:8px 0;color:#6b7280;">Order ID</td><td style="padding:8px 0;font-weight:600;">${donation.razorpay_order_id || ""}</td></tr>
<tr><td style="padding:8px 0;color:#6b7280;">Payment ID</td><td style="padding:8px 0;font-weight:600;">${donation.razorpay_payment_id || ""}</td></tr>
<tr><td style="padding:8px 0;color:#6b7280;">Date</td><td style="padding:8px 0;font-weight:600;">${new Date().toLocaleString("en-IN")}</td></tr>
</table>
<p style="background:#fffdf5;border:1px solid #f0e0b6;border-radius:10px;padding:12px 14px;margin:18px 0 0;color:#78350f;"><strong>Donation Reference:</strong> Payment mandir ki official website ke through receive hua hai - <a href="${websiteUrl}" style="color:#b8860b;font-weight:700;">${websiteUrl}</a></p>
<p><a href="${websiteUrl}" style="display:inline-block;background:#b8860b;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;margin-top:12px;">Visit Website</a></p>
${authorizedSignatureHtml}
</td></tr></table></td></tr></table></body></html>`;

const sendMail = async ({ to, subject, html }) => {
  const transport = mailTransport();
  if (!transport) throw new Error("Mail provider is not configured");
  return transport.sendMail({
    from: process.env.EMAIL_FROM || process.env.GMAIL_USER,
    to,
    subject,
    html,
  });
};

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/signup", asyncRoute(async (req, res) => {
  const { email, password, metadata = {} } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ error: "User already exists" });
  const user = await User.create({
    email: email.toLowerCase(),
    password_hash: await bcrypt.hash(password, 12),
    user_metadata: metadata,
  });
  await modelFor("profiles").create({
    user_id: String(user._id),
    email: user.email,
    display_name: metadata.display_name || email.split("@")[0],
    phone: metadata.phone || "",
  });
  await modelFor("user_roles").create({ user_id: String(user._id), role: metadata.role || "visitor" });
  await attachDonationsToUser(user);
  res.status(201).json({ ok: true });
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || "").toLowerCase() });
  if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  await attachDonationsToUser(user);
  const access_token = signUser(user);
  res.json({ session: { access_token, user: { id: String(user._id), email: user.email, user_metadata: user.user_metadata || {} } } });
}));

app.patch("/api/auth/password", asyncRoute(async (req, res) => {
  const { password } = req.body;
  const resetToken = req.body.resetToken || req.body.token;
  if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  let user = req.user;
  if (!user && resetToken) {
    user = await User.findOne({ resetPasswordToken: resetToken, resetPasswordExpires: { $gt: new Date() } });
  }
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  user.password_hash = await bcrypt.hash(password, 12);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  res.json({ ok: true });
}));

app.post("/api/auth/verify-reset-token", asyncRoute(async (req, res) => {
  const token = String(req.body.token || req.query.token || "").trim();
  if (!token) return res.status(400).json({ error: "Reset token is required" });
  const payload = verifyResetTokenPayload(token);
  if (!payload || payload.purpose !== "reset") return res.status(400).json({ error: "Invalid or expired reset token" });
  const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } });
  if (!user) return res.status(400).json({ error: "Invalid or expired reset token" });
  res.json({ ok: true, message: "Reset link verified" });
}));

app.post("/api/auth/forgot-password", asyncRoute(async (req, res) => {
  const email = String(req.body.email || "").toLowerCase();
  const user = await User.findOne({ email });
  if (user) {
    user.resetPasswordToken = jwt.sign({ sub: String(user._id), purpose: "reset" }, jwtSecret, { expiresIn: "1h" });
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const link = `${frontendUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(user.resetPasswordToken)}`;
    const displayName = user.user_metadata?.display_name || user.email.split("@")[0];
    await sendMail({
      to: user.email,
      subject: "Reset your password for Bada Jain Mandir",
      html: resetPasswordEmailHtml(displayName, link),
    }).catch(console.error);
  }
  res.json({ ok: true });
}));

app.post("/api/auth/reset-password", asyncRoute(async (req, res) => {
  const { token, password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const payload = verifyResetTokenPayload(token);
  if (!payload || payload.purpose !== "reset") return res.status(400).json({ error: "Invalid or expired reset token" });
  const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } });
  if (!user) return res.status(400).json({ error: "Invalid or expired reset token" });
  user.password_hash = await bcrypt.hash(password, 12);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  res.json({ ok: true });
}));

app.post("/api/donations/create-order", asyncRoute(async (req, res) => {
  const amount = Number(req.body.amount);
  const donorName = req.body.donor_name || req.body.name || req.user?.user_metadata?.display_name || req.user?.email;
  const donorEmail = req.body.donor_email || req.body.email || req.user?.email;
  const donorPhone = req.body.donor_phone || req.body.phone || "";
  const purpose = req.body.purpose || "General Donation";
  if (!amount || amount < 1) return res.status(400).json({ error: "Donation amount must be at least 1" });
  if (!donorName || !donorEmail) return res.status(400).json({ error: "Donor name and email are required" });

  const receiptId = String(req.body.metadata?.website_receipt_id || createReceiptId());
  const order = await createRazorpayOrder({ amount, receipt: receiptId });
  const donation = await modelFor("donations").create({
    user_id: req.user ? String(req.user._id) : undefined,
    donor_name: donorName,
    donor_email: donorEmail.toLowerCase(),
    donor_phone: donorPhone,
    name: donorName,
    email: donorEmail.toLowerCase(),
    phone: donorPhone,
    amount,
    currency: order.currency || process.env.DONATION_CURRENCY || "INR",
    purpose,
    message: req.body.message,
    status: "created",
    receipt_number: receiptId,
    razorpay_order_id: order.id,
    created_at: new Date(),
  });

  res.status(201).json({
    key_id: process.env.RAZORPAY_KEY_ID,
    razorpayKey: process.env.RAZORPAY_KEY_ID,
    order_id: order.id,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    donation_id: String(donation._id),
    donor_name: donorName,
    donor_email: donorEmail,
    donor_phone: donorPhone,
    receipt_id: receiptId,
  });
}));

const completeDonationPayment = asyncRoute(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const Donation = modelFor("donations");
  const donation = await Donation.findOne({ razorpay_order_id });
  if (!donation) return res.status(404).json({ error: "Donation order not found" });
  if (!verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })) {
    await Donation.updateOne({ _id: donation._id }, { status: "failed", failure_reason: "Invalid payment signature" });
    return res.status(400).json({ error: "Payment verification failed" });
  }
  const receiptId = donation.receipt_number || createReceiptId();
  const updated = await Donation.findByIdAndUpdate(donation._id, {
    status: "paid",
    razorpay_payment_id,
    razorpay_signature,
    receipt_number: receiptId,
    paid_at: new Date(),
  }, { new: true });
  const recipientEmail = getDonationRecipientEmail(updated, req.body?.email || req.body?.donor_email || "");
  if (recipientEmail) {
    sendMail({
      to: recipientEmail,
      subject: `Donation Receipt - ${receiptId}${updated.razorpay_order_id ? ` (Order: ${updated.razorpay_order_id})` : ""}`,
      html: donationReceiptHtml(updated, receiptId),
    }).catch((error) => console.error("Donation receipt email failed:", error.message));
  }
  res.json({ message: "Donation Successful", donation: normalize(updated), receipt: { id: receiptId }, receipt_id: receiptId });
});

app.post("/api/donations/verify-browser", completeDonationPayment);
app.post("/api/donations/verify", completeDonationPayment);
app.post("/api/donations/verify-payment", completeDonationPayment);

app.get("/api/donations/checkout/:id", asyncRoute(async (req, res) => {
  const donation = await modelFor("donations").findById(req.params.id);
  if (!donation) return res.status(404).send("Donation order not found");
  const returnUrl = req.query.return_url || `${frontendUrl}/donations`;
  const options = {
    key: process.env.RAZORPAY_KEY_ID,
    amount: Math.round(Number(donation.amount) * 100),
    currency: donation.currency || process.env.DONATION_CURRENCY || "INR",
    name: "Shri Digamber Bada Jain Mandir Parham",
    description: donation.purpose || "Temple Donation",
    order_id: donation.razorpay_order_id,
    prefill: {
      name: donation.donor_name || donation.name || "",
      email: donation.donor_email || donation.email || "",
      contact: donation.donor_phone || donation.phone || "",
    },
    theme: { color: "#B88722" },
  };
  res.setHeader("Content-Security-Policy", razorpayCheckoutCsp);
  res.type("html").send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Donation Checkout</title><script src="https://checkout.razorpay.com/v1/checkout.js"></script></head><body><script>
    const options = ${JSON.stringify(options)};
    const returnUrl = ${JSON.stringify(returnUrl)};
    options.handler = async function(payment) {
      const response = await fetch('/api/donations/verify-browser', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payment) });
      const data = await response.json().catch(() => ({}));
      const status = response.ok ? 'success' : 'failed';
      const params = {
        status,
        receipt_id: data.receipt?.id || data.receipt_id || '',
        order_id: payment.razorpay_order_id || (data.donation && data.donation.razorpay_order_id) || '',
        payment_id: payment.razorpay_payment_id || (data.donation && data.donation.razorpay_payment_id) || '',
      };
      location.href = returnUrl + (returnUrl.includes('?') ? '&' : '?') + new URLSearchParams(params).toString();
    };
    options.modal = { ondismiss: function(){ location.href = returnUrl + (returnUrl.includes('?') ? '&' : '?') + 'status=cancelled'; } };
    new Razorpay(options).open();
  </script></body></html>`);
}));

app.get('/api/donations/receipt/:id', requireAdminOrCommittee, asyncRoute(async (req, res) => {
  const Donation = modelFor('donations');
  const donation = await Donation.findById(req.params.id);
  if (!donation) return res.status(404).send('Donation not found');
  const receiptId = donation.receipt_number || createReceiptId();
  const html = donationReceiptHtml(normalize(donation), receiptId);
  res.type('html').send(html);
}));

app.get('/api/donations/export', requireAdminOrCommittee, asyncRoute(async (req, res) => {
  const Donation = modelFor('donations');
  const { start_date, end_date, receipt_id, order_id, payment_id, status } = req.query;
  const filter = {};
  if (receipt_id) filter.receipt_number = String(receipt_id);
  if (order_id) filter.razorpay_order_id = String(order_id);
  if (payment_id) filter.razorpay_payment_id = String(payment_id);
  if (status) filter.status = String(status);
  if (start_date || end_date) {
    filter.created_at = {};
    if (start_date) filter.created_at.$gte = new Date(String(start_date));
    if (end_date) filter.created_at.$lte = new Date(String(end_date));
  }
  // Build mongoose query
  const query = Donation.find(filter).sort({ created_at: -1 });
  const rows = await query;
  const headers = ["id","donor_name","donor_email","donor_phone","amount","currency","purpose","method","receipt_number","razorpay_order_id","razorpay_payment_id","status","created_at","paid_at"];
  const csvRows = [headers.join(',')];
  for (const r of rows) {
    const vals = headers.map(h => {
      const v = r[h] ?? r[h.replace(/_/g,' ')] ?? '';
      return '"' + String((v instanceof Date) ? v.toISOString() : v).replace(/"/g, '""') + '"';
    });
    csvRows.push(vals.join(','));
  }
  const csv = csvRows.join('\n');
  // Append a grand total row
  const totalAmount = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalRow = ["", "", "", "", "Grand Total", "", "", "", "", "", "", "", "", String(totalAmount)];
  csvRows.push(totalRow.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','));
  const finalCsv = csvRows.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="donations_export_${Date.now()}.csv"`);
  res.send(finalCsv);
}));

// POST export (accepts JSON body) - same CSV but uses POST to avoid long query strings
app.post('/api/donations/export', requireAdminOrCommittee, asyncRoute(async (req, res) => {
  const Donation = modelFor('donations');
  const { start_date, end_date, receipt_id, order_id, payment_id, status } = req.body || {};
  const filter = {};
  if (receipt_id) filter.receipt_number = String(receipt_id);
  if (order_id) filter.razorpay_order_id = String(order_id);
  if (payment_id) filter.razorpay_payment_id = String(payment_id);
  if (status) filter.status = String(status);
  if (start_date || end_date) {
    filter.created_at = {};
    if (start_date) filter.created_at.$gte = new Date(String(start_date));
    if (end_date) filter.created_at.$lte = new Date(String(end_date));
  }
  const query = Donation.find(filter).sort({ created_at: -1 });
  const rows = await query;
  const headers = ["id","donor_name","donor_email","donor_phone","amount","currency","purpose","method","receipt_number","razorpay_order_id","razorpay_payment_id","status","created_at","paid_at"];
  const csvRows = [headers.join(',')];
  for (const r of rows) {
    const vals = headers.map(h => {
      const v = r[h] ?? r[h.replace(/_/g,' ')] ?? '';
      return '"' + String((v instanceof Date) ? v.toISOString() : v).replace(/"/g, '""') + '"';
    });
    csvRows.push(vals.join(','));
  }
  const totalAmount = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalRow = ["", "", "", "", "Grand Total", "", "", "", "", "", "", "", "", String(totalAmount)];
  csvRows.push(totalRow.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','));
  const finalCsv = csvRows.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="donations_export_${Date.now()}.csv"`);
  res.send(finalCsv);
}));

// POST paginated donations list for admin (filters + search)
app.post('/api/donations/list', requireAdminOrCommittee, asyncRoute(async (req, res) => {
  const Donation = modelFor('donations');
  const { page = 1, limit = 20, start_date, end_date, receipt_id, order_id, payment_id, status, search } = req.body || {};
  const filter = {};
  if (receipt_id) filter.receipt_number = String(receipt_id);
  if (order_id) filter.razorpay_order_id = String(order_id);
  if (payment_id) filter.razorpay_payment_id = String(payment_id);
  if (status) filter.status = String(status);
  if (start_date || end_date) {
    filter.created_at = {};
    if (start_date) filter.created_at.$gte = new Date(String(start_date));
    if (end_date) filter.created_at.$lte = new Date(String(end_date));
  }
  if (search) {
    const s = String(search).trim();
    filter.$or = [
      { receipt_number: { $regex: s, $options: 'i' } },
      { razorpay_order_id: s },
      { razorpay_payment_id: s },
      { donor_name: { $regex: s, $options: 'i' } },
      { donor_email: { $regex: s, $options: 'i' } },
    ];
  }
  const p = Math.max(1, Number(page || 1));
  const l = Math.max(1, Math.min(200, Number(limit || 20)));
  const total = await Donation.countDocuments(filter);
  const rows = await Donation.find(filter).sort({ created_at: -1 }).skip((p - 1) * l).limit(l);
  res.json({ data: rows.map(normalize), total, page: p, limit: l });
}));

app.get('/api/donations/receipt-pdf/:id', requireAdminOrCommittee, asyncRoute(async (req, res) => {
  const Donation = modelFor('donations');
  const donation = await Donation.findById(req.params.id);
  if (!donation) return res.status(404).send('Donation not found');
  const receiptId = donation.receipt_number || createReceiptId();
  const html = donationReceiptHtml(normalize(donation), receiptId);

  // Try Puppeteer first (supports puppeteer or puppeteer-core with executable path)
  try {
    let puppeteerModule = null;
    try { puppeteerModule = require('puppeteer'); } catch (e) { /* ignore */ }
    if (!puppeteerModule) {
      try { puppeteerModule = require('puppeteer-core'); } catch (e) { /* ignore */ }
    }
    if (puppeteerModule) {
      const launchOptions = { args: ['--no-sandbox', '--disable-setuid-sandbox'] };
      if (process.env.PUPPETEER_EXECUTABLE_PATH) launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      const browser = await puppeteerModule.launch(launchOptions);
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="receipt_${receiptId}.pdf"`);
      return res.send(pdfBuffer);
    }
  } catch (err) {
    console.warn('Puppeteer PDF generation failed:', err && err.message ? err.message : err);
  }

  // Fallback: call external PDF service if configured (expects POST { html })
  if (process.env.PDF_SERVICE_URL) {
    try {
      const response = await fetch(process.env.PDF_SERVICE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, filename: `receipt_${receiptId}.pdf` }),
      });
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="receipt_${receiptId}.pdf"`);
        return res.send(Buffer.from(buffer));
      }
      console.warn('PDF service returned non-200:', response.status);
    } catch (err) {
      console.warn('External PDF service failed:', err && err.message ? err.message : err);
    }
  }

  // Last-resort fallback: return HTML so client can Print->Save as PDF
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `inline; filename="receipt_${receiptId}.html"`);
  res.status(200).send(html);
}));

app.get("/api/tables/:table", asyncRoute(async (req, res) => {
  if (appContentTables.has(req.params.table)) return proxyContentTable(req, res);
  if (!(await applyTableReadAccess(req, res))) return;
  const Model = modelFor(req.params.table);
  const filter = buildFilter(req.query);
  let query = Model.find(filter);
  if (req.query.order) query = query.sort({ [req.query.order]: req.query.ascending === "false" ? -1 : 1 });
  if (req.query.limit) query = query.limit(Number(req.query.limit));
  const rows = await query;
  const data = req.params.table === "committee_public" ? redactCommittee(rows) : rows.map(normalize);
  if (req.query.count === "true" && req.query.head === "true") return res.json({ data: null, count: data.length });
  res.json({ data: req.query.single === "true" ? data[0] || null : data, count: data.length });
}));

app.post("/api/tables/:table", requireTableWriteAccess, asyncRoute(async (req, res) => {
  if (appContentTables.has(req.params.table)) return proxyContentTable(req, res);
  const Model = modelFor(req.params.table);
  const payload = Array.isArray(req.body) ? req.body : [req.body];
  const docs = await Model.insertMany(payload.map((item) => ({ ...item, created_at: item.created_at || new Date() })));
  res.status(201).json({ data: Array.isArray(req.body) ? docs.map(normalize) : normalize(docs[0]) });
}));

app.put("/api/tables/:table", requireTableWriteAccess, asyncRoute(async (req, res) => {
  if (appContentTables.has(req.params.table)) return proxyContentTable(req, res);
  const Model = modelFor(req.params.table);
  const item = { ...req.body };
  const id = item.id || item._id;
  delete item.id;
  delete item._id;
  const sanitized = { ...item };
  if (isCommitteeContentTable(req.params.table)) {
    if (sanitized.email === undefined) sanitized.email = "";
    if (sanitized.phone === undefined) sanitized.phone = "";
    if (sanitized.password === undefined) sanitized.password = "";
  }
  const doc = id
    ? await Model.findByIdAndUpdate(id, sanitized, { new: true, upsert: true })
    : await Model.create(sanitized);
  res.json({ data: normalize(doc) });
}));

app.patch("/api/tables/:table", requireTableWriteAccess, asyncRoute(async (req, res) => {
  if (appContentTables.has(req.params.table)) return proxyContentTable(req, res);
  const Model = modelFor(req.params.table);
  const docs = await Model.updateMany(buildFilter(req.query), req.body);
  const rows = await Model.find(buildFilter(req.query));
  res.json({ data: rows.map(normalize), count: docs.modifiedCount });
}));

app.delete("/api/tables/:table", requireTableWriteAccess, asyncRoute(async (req, res) => {
  if (appContentTables.has(req.params.table)) return proxyContentTable(req, res);
  const Model = modelFor(req.params.table);
  const result = await Model.deleteMany(buildFilter(req.query));
  res.json({ data: null, count: result.deletedCount });
}));

const storage = multer({
  storage: hasCloudinaryConfig
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadDir),
        filename: (_req, file, cb) => cb(null, safeFileName(file.originalname)),
      }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const uploadToCloudinary = (file, bucket) => new Promise((resolve, reject) => {
  const folder = [process.env.CLOUDINARY_FOLDER || "bada-jain-mandir-parham", bucket]
    .filter(Boolean)
    .join("/");
  const stream = cloudinary.uploader.upload_stream(
    {
      folder,
      resource_type: "auto",
      public_id: path.parse(file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, "_"),
      overwrite: false,
    },
    (error, result) => {
      if (error) reject(error);
      else resolve(result);
    }
  );
  stream.end(file.buffer);
});

app.post("/api/storage/:bucket/upload", requireAdmin, storage.single("file"), asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "File is required" });
  if (hasCloudinaryConfig) {
    const uploaded = await uploadToCloudinary(req.file, req.params.bucket);
    return res.json({
      data: {
        path: uploaded.public_id,
        publicUrl: uploaded.secure_url,
        provider: "cloudinary",
      },
    });
  }
  const bucketDir = path.join(uploadDir, req.params.bucket);
  fs.mkdirSync(bucketDir, { recursive: true });
  const target = path.join(bucketDir, req.file.originalname);
  fs.renameSync(req.file.path, target);
  res.json({ data: { path: req.file.originalname, publicUrl: `${backendUrl}/uploads/${req.params.bucket}/${req.file.originalname}` } });
}));

app.post("/api/functions/send-welcome-email", asyncRoute(async (req, res) => {
  const { to, name, position, phone } = req.body;
  if (!to) return res.status(400).json({ error: "Recipient email is required" });
  const isCommitteeEmail = Boolean(position || phone);
  await sendMail({
    to,
    subject: isCommitteeEmail
      ? "Jai Jinendra - Committee Login Details"
      : "Jai Jinendra - Mandir App Ab Available Hai",
    html: isCommitteeEmail ? committeeCredentialsHtml({ name, position, phone }) : welcomeHtml(name),
  });
  res.json({ success: true });
}));

app.post("/api/functions/send-bulk-welcome-email", requireUser, asyncRoute(async (req, res) => {
  if (!(await isAdmin(req.user._id))) return res.status(403).json({ error: "Admin role required" });
  const profiles = await modelFor("profiles").find({ email: { $exists: true, $ne: "" } });
  const committee = await modelFor("committee").find({ email: { $exists: true, $ne: "" } });
  const recipients = new Map();
  profiles.forEach((p) => recipients.set(String(p.email).toLowerCase(), p.display_name || p.email));
  committee.forEach((c) => recipients.set(String(c.email).toLowerCase(), c.name || "Devotee"));
  let sent = 0;
  const errors = [];
  for (const [email, name] of recipients) {
    try {
      await sendMail({ to: email, subject: "Jai Jinendra - Mandir App Ab Available Hai", html: welcomeHtml(name) });
      sent += 1;
    } catch (error) {
      errors.push(`${email}: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  res.json({ success: errors.length === 0, total: recipients.size, sent, failed: errors.length, errors });
}));

app.post("/api/functions/committee-auth", asyncRoute(async (req, res) => {
  const { action } = req.body;
  const Committee = modelFor("committee");
  if (action === "login") {
    const member = await Committee.findById(req.body.memberId);
    const passwordOk = member ? await verifyCommitteePassword({ member, password: req.body.password, debug: true }) : false;
    if (!member || !passwordOk) {
      return res.status(401).json({ error: "Incorrect password" });
    }
    const item = normalize(member);
    delete item.password;
    delete item.password_hash;
    return res.json({ member: item, sessionToken: signCommittee(member) });
  }
  if (action === "verify-reset") {
    const member = await Committee.findById(req.body.memberId);
    const input = String(req.body.phoneOrEmail || "").trim();
    const ok = Boolean(member && matchesCommitteeIdentity({ member, input, debug: true }));
    if (!ok) {
      console.log("[verify-reset] Verification failed for memberId:", req.body.memberId, "input:", req.body.phoneOrEmail);
      return res.status(400).json({ error: "Verification failed" });
    }
    return res.json({ token: jwt.sign({ sub: String(member._id), type: "committee-reset" }, jwtSecret, { expiresIn: "15m" }) });
  }
  if (action === "reset-password") {
    const payload = jwt.verify(req.body.token, jwtSecret);
    if (payload.type !== "committee-reset") return res.status(400).json({ error: "Invalid token" });
    await Committee.findByIdAndUpdate(payload.sub, { password_hash: await bcrypt.hash(req.body.newPassword, 12), password: undefined });
    return res.json({ ok: true });
  }
  if (action === "change-password") {
    const member = await Committee.findById(req.body.memberId);
    const hash = member?.password_hash || member?.password;
    if (!member || !hash || !(await bcrypt.compare(req.body.currentPassword || "", hash))) return res.status(401).json({ error: "Current password is wrong" });
    await Committee.findByIdAndUpdate(member._id, { password_hash: await bcrypt.hash(req.body.newPassword, 12), password: undefined });
    return res.json({ ok: true });
  }
  if (action === "update-email") {
    const member = await Committee.findById(req.body.memberId);
    const hash = member?.password_hash || member?.password;
    if (!member || !hash || !(await bcrypt.compare(req.body.currentPassword || "", hash))) return res.status(401).json({ error: "Current password is wrong" });
    await Committee.findByIdAndUpdate(member._id, { email: req.body.email });
    return res.json({ ok: true });
  }
  if (["list-donations", "gallery-signed-upload", "gallery-add", "gallery-delete"].includes(action)) {
    await verifyCommitteeToken(req.body.sessionToken);
    if (action === "list-donations") return res.json({ donations: (await modelFor("donations").find().sort({ created_at: -1 })).map(normalize) });
    if (action === "gallery-signed-upload") {
      const fileName = safeFileName(req.body.fileName || "upload");
      return res.json({ signedUrl: `${backendUrl}/uploads/signed/gallery/${fileName}`, publicUrl: `${backendUrl}/uploads/gallery/${fileName}` });
    }
    if (action === "gallery-add") {
      const item = await modelFor("gallery").create({ title: req.body.title, type: req.body.type, url: req.body.url });
      return res.json({ item: normalize(item) });
    }
    if (action === "gallery-delete") {
      await modelFor("gallery").findByIdAndDelete(req.body.id);
      return res.json({ ok: true });
    }
  }
  res.status(400).json({ error: "Unknown action" });
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

const seedAdmin = async () => {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) return;
  let user = await User.findOne({ email: process.env.ADMIN_EMAIL.toLowerCase() });
  if (!user) {
    user = await User.create({
      email: process.env.ADMIN_EMAIL.toLowerCase(),
      password_hash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
      user_metadata: { display_name: process.env.ADMIN_NAME || "Mandir Admin", phone: process.env.ADMIN_PHONE || "" },
    });
    await modelFor("profiles").create({
      user_id: String(user._id),
      email: user.email,
      display_name: process.env.ADMIN_NAME || "Mandir Admin",
      phone: process.env.ADMIN_PHONE || "",
    });
  }
  if (!(await modelFor("user_roles").findOne({ user_id: String(user._id), role: "admin" }))) {
    await modelFor("user_roles").create({ user_id: String(user._id), role: "admin" });
  }
};

const syncCommitteeMembers = async () => {
  try {
    const Committee = modelFor("committee");
    let remoteMembers = [];

    // Try to fetch from app content API first
    if (appContentApiBaseUrl && appContentAdminToken) {
      const res = await fetch(`${appContentApiBaseUrl}/committee`, {
        headers: { "Authorization": `Bearer ${appContentAdminToken}` },
      });
      if (res.ok) {
        remoteMembers = (await res.json()).data || [];
        console.log("Committee members fetched from API");
      } else {
        console.warn("Failed to fetch committee members from API:", res.status);
      }
    }

    // Fallback: fetch from local committee_public table
    if (remoteMembers.length === 0) {
      const localMembers = await modelFor("committee_public").find({});
      remoteMembers = localMembers.map((m) => normalize(m));
      console.log("Committee members fetched from local database");
    }

    if (remoteMembers.length === 0) {
      return console.log("Committee sync skipped: No members found");
    }

    let synced = 0;
    for (const member of remoteMembers) {
      if (!member._id || !member.phone) continue;
      const existing = await Committee.findById(member._id);
      const passwordHash = await bcrypt.hash(member.phone, 12);
      if (existing) {
        await Committee.findByIdAndUpdate(member._id, {
          name: member.name,
          position: member.position,
          phone: member.phone,
          email: member.email || "",
          image_url: member.image_url,
          display_order: member.display_order,
          password_hash: passwordHash,
        });
      } else {
        await Committee.create({
          _id: member._id,
          name: member.name,
          position: member.position,
          phone: member.phone,
          email: member.email || "",
          image_url: member.image_url,
          display_order: member.display_order,
          password_hash: passwordHash,
        });
        synced += 1;
      }
    }
    console.log(`Committee members synced: ${remoteMembers.length} total, ${synced} new`);
  } catch (error) {
    console.error("Committee sync error:", error.message);
  }
};

const connectDatabase = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const localUri = process.env.LOCAL_MONGODB_URI || "mongodb://127.0.0.1:27017/bada_jain_mandir_website";

  if (!primaryUri && process.env.NODE_ENV === "production") {
    throw new Error("MONGODB_URI is required in production. Set it in your Render environment variables to point to your MongoDB database.");
  }

  const uriToConnect = primaryUri || localUri;
  try {
    await mongoose.connect(uriToConnect, { serverSelectionTimeoutMS: 8000 });
    console.log(`MongoDB connected: ${uriToConnect.startsWith("mongodb+srv://") ? "Atlas" : uriToConnect.startsWith("mongodb://127.0.0.1") ? "local" : "remote"}`);
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    if (uriToConnect !== localUri) {
      console.warn(`Primary MongoDB failed, using local MongoDB: ${error.message}`);
      await mongoose.connect(localUri, { serverSelectionTimeoutMS: 8000 });
      console.log("MongoDB connected: local fallback");
      return;
    }
    throw error;
  }
};

await connectDatabase();
await seedAdmin();
await syncCommitteeMembers();
app.listen(port, () => console.log(`Backend running on ${backendUrl}`));

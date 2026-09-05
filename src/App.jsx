import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard, Wallet, Landmark, Layers, Briefcase, Snowflake, Flame,
  TrendingUp, Shield, Banknote, PiggyBank, History, Settings as SettingsIcon,
  Plus, Minus, RefreshCw, Download, X, Globe, ArrowUpRight, ArrowDownRight,
  Trash2, Edit3, ArrowLeftRight, Sparkles, ShoppingCart, UtensilsCrossed, Wifi,
  Shirt, PartyPopper, Receipt, HandCoins, MoreHorizontal, Target, List, PieChart as PieChartIcon, Coins, Upload,
  Users, LineChart, Calculator, Gift
} from "lucide-react";
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

/* ============================================================================
   POOLAKOO — Wealth & Crypto Dashboard
   Local-first personal finance tracker. All data persists in the browser
   (localStorage).

   CURRENCY MODEL — read this before touching money math:
   Every basket, DeFi position, loan, and goal has a `nativeCurrency`
   ("USD" | "IRT") chosen when it's created, and its balance/principal/target
   numbers are stored EXACTLY as entered, in that currency — never silently
   normalized to USD. Viewing an item in its own native currency always
   shows the exact frozen number, unaffected by later USDT/IRT rate changes.
   Only when you view something in the OTHER currency (or in an aggregate
   total spanning multiple accounts) does a live-rate conversion happen —
   that's unavoidable and expected, since a true multi-currency total has to
   use *some* rate. Individual accounts/records never drift; totals do.
   ============================================================================ */

/* --------------------------- Design tokens ------------------------------- */
const PALETTE = {
  bg: "#0A0F14", bgSoft: "#0F161D", panel: "#141C24", panelBorder: "#22303A",
  ink: "#E7EEF2", inkDim: "#8DA0AC", teal: "#33D6B0", amber: "#E8B15C",
  coral: "#E8735C", violet: "#8B7FE8",
};

const CATEGORY_META = {
  bank:        { label: { en: "Bank Accounts",        fa: "حساب‌های بانکی" }, icon: Landmark,   color: "#5B9DE8" },
  project:     { label: { en: "Project Expenses",      fa: "هزینه‌های پروژه" }, icon: Briefcase,  color: PALETTE.violet },
  coldWallet:  { label: { en: "Cold Wallets",           fa: "کیف پول سرد" }, icon: Snowflake,  color: "#6FD0E8" },
  hotWallet:   { label: { en: "Hot Wallets",            fa: "کیف پول گرم" }, icon: Flame,      color: PALETTE.coral },
  investment:  { label: { en: "Long-term Investments",  fa: "سرمایه‌گذاری بلندمدت" }, icon: TrendingUp, color: PALETTE.amber },
  insurance:   { label: { en: "Insurance Funds",        fa: "صندوق بیمه" }, icon: Shield,     color: "#8DA0AC" },
  cash:        { label: { en: "Purchasing Power",       fa: "قدرت خرید نقدی" }, icon: Banknote,   color: "#E8D75C" },
  savings:     { label: { en: "Savings",                fa: "پس‌انداز" }, icon: PiggyBank,  color: "#5CE8A0" },
};
const DEFI_META = { label: { en: "DeFi Positions", fa: "پوزیشن‌های دیفای" }, icon: Layers, color: PALETTE.teal };
const LOAN_META = { label: { en: "Loans", fa: "وام‌ها" }, icon: HandCoins, color: "#E8D75C" };
const GOAL_META = { label: { en: "Goals", fa: "اهداف" }, icon: Target, color: PALETTE.violet };
const DEBT_META = { label: { en: "Debts", fa: "بدهی‌ها" }, icon: Users, color: "#E8935C" };
function categoryMeta(cat) {
  if (cat === "defi") return DEFI_META;
  if (cat === "loan") return LOAN_META;
  if (cat === "goal") return GOAL_META;
  if (cat === "debt") return DEBT_META;
  return CATEGORY_META[cat];
}

const TX_CATEGORIES = {
  groceries:  { label: { en: "Groceries", fa: "خواربار" }, icon: ShoppingCart, color: "#5CE8A0" },
  restaurant: { label: { en: "Restaurant", fa: "رستوران" }, icon: UtensilsCrossed, color: "#E8B15C" },
  utilities:  { label: { en: "Internet & Charge", fa: "اینترنت و شارژ" }, icon: Wifi, color: "#5B9DE8" },
  clothes:    { label: { en: "Clothes", fa: "پوشاک" }, icon: Shirt, color: "#8B7FE8" },
  fun:        { label: { en: "Fun", fa: "تفریح" }, icon: PartyPopper, color: "#E86FA0" },
  bills:      { label: { en: "Bills", fa: "قبوض" }, icon: Receipt, color: "#E8735C" },
  loan:       { label: { en: "Loan", fa: "وام" }, icon: HandCoins, color: "#E8D75C" },
  others:     { label: { en: "Others", fa: "سایر" }, icon: MoreHorizontal, color: "#8DA0AC" },
};
// Categories offered when the transaction type is "deposit" (income), kept
// distinct from the expense categories above.
const DEPOSIT_CATEGORIES = {
  airdrop:  { label: { en: "Airdrop", fa: "ایردراپ" }, icon: Gift, color: "#E8B15C" },
  interest: { label: { en: "Interest", fa: "سود" }, icon: Sparkles, color: PALETTE.teal },
  work:     { label: { en: "Work", fa: "کار" }, icon: Briefcase, color: PALETTE.violet },
  other:    { label: { en: "Other", fa: "سایر" }, icon: MoreHorizontal, color: "#8DA0AC" },
};
function txCatLabel(key, lang) { return TX_CATEGORIES[key]?.label[lang] || key; }
function depositCatLabel(key, lang) { return DEPOSIT_CATEGORIES[key]?.label[lang] || key; }
// Looks up icon/color/label for a txCategory value regardless of whether it
// came from the expense set or the income set.
function txCategoryMeta(key) { return TX_CATEGORIES[key] || DEPOSIT_CATEGORIES[key] || null; }

const CHAIN_OPTIONS = [
  { id: "ethereum", label: "Ethereum" }, { id: "binance_smart", label: "BNB Smart Chain" },
  { id: "polygon", label: "Polygon" }, { id: "arbitrum", label: "Arbitrum" },
  { id: "optimism", label: "Optimism" }, { id: "base", label: "Base" },
  { id: "avalanche", label: "Avalanche" }, { id: "solana", label: "Solana" }, { id: "bitcoin", label: "Bitcoin" },
];

/* --------------------------- Live USDT→IRT rate ---------------------------- */
async function fetchUsdtRateLive() {
  const res = await fetch("/api/usdt");
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.irt == null) {
    throw new Error(body?.detail || body?.error || "Could not fetch USDT rate");
  }
  return body.irt;
}

/* --------------------------------- i18n ----------------------------------- */
const STR = {
  appName: { en: "PoolaKoo", fa: "پولاکو" },
  tagline: { en: "your wealth, in one quiet room", fa: "ثروت شما، در یک اتاق آرام" },
  nav: {
    dashboard: { en: "Dashboard", fa: "داشبورد" }, portfolio: { en: "Portfolio", fa: "پرتفوی" },
    wallets: { en: "Wallets", fa: "کیف‌پول‌ها" }, defi: { en: "DeFi", fa: "دیفای" },
    loans: { en: "Loans", fa: "وام‌ها" }, goals: { en: "Goals", fa: "اهداف" },
    debts: { en: "Debts", fa: "بدهی‌ها" }, trading: { en: "Trading", fa: "معامله‌گری" },
    activity: { en: "Activity", fa: "فعالیت‌ها" }, settings: { en: "Settings", fa: "تنظیمات" },
  },
  totalNetWorth: { en: "Total Net Worth", fa: "ارزش خالص کل" },
  addBasket: { en: "New Basket", fa: "بسکت جدید" },
  addTx: { en: "Add / Subtract", fa: "افزودن / کسر" },
  breakdown: { en: "Portfolio Breakdown", fa: "تفکیک پرتفوی" },
  defiProjection: { en: "DeFi Yield Projection", fa: "پیش‌بینی سود دیفای" },
  monthly: { en: "Monthly", fa: "ماهانه" }, yearly: { en: "Yearly", fa: "سالانه" }, weekly: { en: "Weekly", fa: "هفتگی" },
  noData: { en: "Nothing here yet.", fa: "هنوز چیزی ثبت نشده." },
  balance: { en: "Balance", fa: "موجودی" }, apy: { en: "Interest Rate (APY %)", fa: "نرخ سود سالانه (%)" },
  date: { en: "Date", fa: "تاریخ" },
  insufficientFunds: { en: "Not enough balance in this account for that amount.", fa: "موجودی این حساب برای این مبلغ کافی نیست." },
  category: { en: "Category", fa: "دسته" }, name: { en: "Name", fa: "نام" }, amount: { en: "Amount", fa: "مبلغ" },
  save: { en: "Save", fa: "ذخیره" }, cancel: { en: "Cancel", fa: "انصراف" }, delete: { en: "Delete", fa: "حذف" }, edit: { en: "Edit", fa: "ویرایش" },
  deposit: { en: "Deposit", fa: "واریز" }, withdraw: { en: "Withdraw", fa: "برداشت" },
  interest: { en: "Interest", fa: "سود" }, transfer: { en: "Transfer", fa: "انتقال" },
  note: { en: "Note (optional)", fa: "یادداشت (اختیاری)" }, walletAddress: { en: "Wallet Address", fa: "آدرس کیف‌پول" },
  allCategories: { en: "All categories", fa: "همه دسته‌ها" },
  usdtRate: { en: "USDT → IRT rate (manual override)", fa: "نرخ تتر به تومان (ورود دستی)" },
  liveRateTitle: { en: "Live USDT rate", fa: "نرخ زنده تتر" },
  rateUnavailable: { en: "Rate unavailable — tap to retry", fa: "نرخ در دسترس نیست — برای تلاش دوباره ضربه بزنید" },
  language: { en: "Language", fa: "زبان" }, currency: { en: "Currency", fa: "واحد پول" },
  emptyBaskets: { en: "No baskets yet — create your first one.", fa: "هنوز بسکتی نساخته‌اید." },
  selectBasket: { en: "Target", fa: "مقصد" },
  relativeToTotal: { en: "of net worth", fa: "از ارزش کل" },
  connectAddressHint: {
    en: "Paste an EVM/BTC/Solana address to label a wallet. Balances are entered manually — use the Deposit/Withdraw buttons to keep them current.",
    fa: "آدرس EVM/بیت‌کوین/سولانا را برای برچسب‌گذاری کیف‌پول وارد کنید. موجودی به‌صورت دستی وارد می‌شود."
  },
  chain: { en: "Blockchain", fa: "شبکه" },
  addDefi: { en: "New DeFi Position", fa: "پوزیشن دیفای جدید" }, connectedWallet: { en: "Connected Wallet", fa: "کیف‌پول متصل" },
  emptyDefi: { en: "No DeFi positions yet — connect one to a wallet.", fa: "هنوز پوزیشن دیفای نساخته‌اید." },
  needsWalletFirst: { en: "Add a hot or cold wallet before creating a DeFi position.", fa: "قبل از ساخت پوزیشن دیفای، یک کیف‌پول اضافه کنید." },
  spendingCategory: { en: "Spending Category (optional)", fa: "دسته‌بندی هزینه (اختیاری)" },
  incomeCategory: { en: "Income Category (optional)", fa: "دسته‌بندی درآمد (اختیاری)" },
  transferFrom: { en: "Transfer From", fa: "انتقال از" },
  transferTo: { en: "Transfer To", fa: "انتقال به" },
  transferNeedsTwo: { en: "You need at least two baskets or DeFi positions to transfer between.", fa: "برای انتقال به حداقل دو بسکت یا پوزیشن دیفای نیاز دارید." },
  confirmDelete: { en: "Are you sure you want to delete this? This can't be undone.", fa: "آیا مطمئن هستید که می‌خواهید این را حذف کنید؟ این کار قابل بازگشت نیست." },
  addLoan: { en: "New Loan", fa: "وام جدید" }, principal: { en: "Principal", fa: "مبلغ اصلی وام" },
  months: { en: "Months to Repay", fa: "تعداد ماه بازپرداخت" }, dueDay: { en: "Monthly Due Day (1–28)", fa: "روز سررسید ماهانه (۱ تا ۲۸)" },
  monthlyPayment: { en: "Monthly Payment", fa: "قسط ماهانه" }, totalOwed: { en: "Total to Repay", fa: "مجموع بازپرداخت" },
  paidSoFar: { en: "Paid So Far", fa: "پرداخت‌شده تاکنون" }, remaining: { en: "Remaining", fa: "باقیمانده" },
  nextDue: { en: "Next Due", fa: "سررسید بعدی" }, daysLeft: { en: "days left", fa: "روز باقیمانده" },
  overdue: { en: "Overdue", fa: "معوق" }, logPayment: { en: "Log Payment", fa: "ثبت قسط" },
  payFrom: { en: "Pay from (optional)", fa: "پرداخت از (اختیاری)" }, noAccount: { en: "— just track, no account —", fa: "— فقط ثبت، بدون حساب —" },
  emptyLoans: { en: "No loans yet.", fa: "هنوز وامی ثبت نشده." }, paidOff: { en: "Paid Off", fa: "تسویه‌شده" },
  monthsPaid: { en: "months paid", fa: "ماه پرداخت‌شده" },
  addGoal: { en: "New Goal", fa: "هدف جدید" }, targetAmount: { en: "Target Amount", fa: "مبلغ هدف" },
  currentAmount: { en: "Saved So Far", fa: "پس‌انداز تاکنون" }, emptyGoals: { en: "No goals yet — set your first target.", fa: "هنوز هدفی ثبت نشده." },
  contribute: { en: "Contribute", fa: "افزودن" }, listView: { en: "List", fa: "فهرست" }, breakdownView: { en: "Breakdown", fa: "تفکیک" },
  income: { en: "Income", fa: "درآمد" }, expenses: { en: "Expenses", fa: "هزینه‌ها" },
  target: { en: "Target", fa: "مقصد" }, editActivity: { en: "Edit Activity", fa: "ویرایش فعالیت" },
  backupRestore: { en: "Backup & Restore", fa: "پشتیبان‌گیری و بازیابی" },
  exportBackup: { en: "Export Backup", fa: "خروجی پشتیبان" },
  importBackup: { en: "Import Backup", fa: "وارد کردن پشتیبان" },
  backupHint: { en: "Export saves everything on this device to a file. Import replaces all current data with that file's contents.", fa: "خروجی، همه اطلاعات این دستگاه را در یک فایل ذخیره می‌کند. وارد کردن، تمام داده‌های فعلی را با محتوای آن فایل جایگزین می‌کند." },
  importConfirm: { en: "This will replace all current data with the backup file. Continue?", fa: "این کار تمام داده‌های فعلی را با فایل پشتیبان جایگزین می‌کند. ادامه می‌دهید؟" },
  importSuccess: { en: "Backup imported successfully.", fa: "پشتیبان با موفقیت وارد شد." },
  importError: { en: "Could not read that file — make sure it's a backup exported from this app.", fa: "این فایل قابل خواندن نیست — مطمئن شوید فایل پشتیبان همین برنامه است." },
  nativeCurrencyNote: { en: "This account is tracked in its own currency and won't drift when the USDT rate changes.", fa: "این حساب با واحد پول خودش ثبت می‌شود و با تغییر نرخ تتر تغییر نمی‌کند." },
  notEditable: { en: "Editing isn't available for this entry — delete and re-add if needed.", fa: "این مورد قابل ویرایش نیست — در صورت نیاز حذف و دوباره ثبت کنید." },

  /* Debtor & Creditor */
  addDebt: { en: "New Debt", fa: "بدهی جدید" },
  owedToMe: { en: "Owed to Me", fa: "طلب از دیگران" },
  iOwe: { en: "I Owe", fa: "بدهی من" },
  debtType: { en: "Type", fa: "نوع" },
  totalAmount: { en: "Total Amount", fa: "مبلغ کل" },
  emptyDebts: { en: "No debts yet — add someone who owes you, or something you owe.", fa: "هنوز بدهی‌ای ثبت نشده." },
  payFromReceived: { en: "Received into (optional)", fa: "دریافت به حساب (اختیاری)" },

  /* Trading */
  riskCalculator: { en: "Risk Management Calculator", fa: "ماشین‌حساب مدیریت ریسک" },
  totalCapital: { en: "Total Capital", fa: "کل سرمایه" },
  entryPoint: { en: "Entry Point", fa: "نقطه ورود" },
  stopLossPoint: { en: "Stop-Loss Point", fa: "نقطه حد ضرر" },
  riskPercent: { en: "Risk % of Capital", fa: "درصد ریسک از سرمایه" },
  leverage: { en: "Leverage", fa: "اهرم" },
  entryFeePercent: { en: "Entry Fee %", fa: "درصد کارمزد ورود" },
  exitFeePercent: { en: "Exit Fee %", fa: "درصد کارمزد خروج" },
  positionSizeCurrency: { en: "Position Size ($)", fa: "حجم پوزیشن (مبلغی)" },
  positionSizeUnits: { en: "Position Size (units)", fa: "حجم پوزیشن (واحد دارایی)" },
  riskAmount: { en: "Risk Amount", fa: "مبلغ ریسک" },
  notionalExposure: { en: "Notional Exposure", fa: "ارزش کل پوزیشن (نوسیونال)" },
  stopDistance: { en: "Stop Distance", fa: "فاصله تا حد ضرر" },
  riskCalcHint: {
    en: "Fill in your capital, entry/stop prices, risk %, leverage, and fees — the position size updates live.",
    fa: "سرمایه، قیمت ورود/حد ضرر، درصد ریسک، اهرم و کارمزدها را وارد کنید — حجم پوزیشن بلافاصله محاسبه می‌شود."
  },
};
function t(key, lang) { const e = STR[key]; if (!e) return key; return e[lang] || e.en; }
function catLabel(cat, lang) { return categoryMeta(cat)?.label[lang] || cat; }

/* ------------------------------ Utilities --------------------------------- */
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const nowISO = () => new Date().toISOString();
function fmtUSD(n) { const v = Number(n) || 0; return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 }); }
function fmtIRT(n, rate) { const v = (Number(n) || 0) * (rate || 0); return Math.round(v).toLocaleString("en-US") + " تومان"; }
function fmtMoney(n, currency, rate) { return currency === "USD" ? fmtUSD(n) : fmtIRT(n, rate); }
// Formats a number that is ALREADY denominated in `curr` — no rate math.
function fmtExact(n, curr) {
  const v = Number(n) || 0;
  return curr === "USD" ? fmtUSD(v) : Math.round(v).toLocaleString("en-US") + " تومان";
}
function pct(n) { const v = Number(n) || 0; const sign = v > 0 ? "+" : ""; return sign + v.toFixed(2) + "%"; }
// Wraps any delete action with a native confirm() prompt — used on every
// delete button across the app so nothing is removed by an accidental tap.
function confirmAnd(lang, fn) {
  return () => { if (window.confirm(t("confirmDelete", lang))) fn(); };
}
function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
// Standard loan amortization formula. Pure math — no currency conversion
// involved, so it operates directly in whatever currency `principal` is.
function loanMonthlyPayment(principal, apy, months) {
  const r = (Number(apy) || 0) / 100 / 12;
  const n = Math.max(Number(months) || 1, 1);
  const P = Number(principal) || 0;
  if (r === 0) return P / n;
  return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}
function loanNextDueDate(loan) {
  const day = Math.min(Math.max(Number(loan.dueDay) || 1, 1), 28);
  const now = new Date();
  let due = new Date(now.getFullYear(), now.getMonth(), day, 23, 59, 59);
  if (due < now) due = new Date(now.getFullYear(), now.getMonth() + 1, day, 23, 59, 59);
  return due;
}

/* ------------------- Currency conversion helpers (native model) ----------- */
// Converts an unsigned magnitude from `amountMeta` (as typed, in its own
// currency) into `targetCurrency` terms — exact if currencies match, else
// uses the current rate. This is what gets added/subtracted to an account's
// own native-currency balance, so once applied it never needs recomputing.
function amountInCurrency(amountMeta, targetCurrency, rate) {
  if (amountMeta.currency === targetCurrency) return amountMeta.entered;
  if (targetCurrency === "USD") return amountMeta.usd;
  return amountMeta.usd * (rate || 1);
}
function toUSDValue(amount, nativeCurrency, rate) {
  const v = Number(amount) || 0;
  return nativeCurrency === "USD" ? v : v / (rate || 1);
}
// Displays a native-currency amount: exact/frozen if the account's own
// currency matches what's currently selected app-wide, otherwise a live
// conversion (unavoidable when crossing currencies).
function displayNative(amount, nativeCurrency, displayCurrency, rate) {
  const nc = nativeCurrency || "USD";
  if (nc === displayCurrency) return fmtExact(amount, displayCurrency);
  const usd = toUSDValue(amount, nc, rate);
  return fmtMoney(usd, displayCurrency, rate);
}

/* ------------------------------ Storage hook ------------------------------ */
const STORE_KEY = "wealth-dashboard-v4";
const DEFAULT_DATA = {
  baskets: [], defiPositions: [], loans: [], goals: [], debts: [], activities: [],
  settings: { lang: "en", currency: "USD", usdtToIrt: 950000 },
};
function useWealthStore() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData({ ...DEFAULT_DATA, ...parsed, settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) } });
      }
    } catch (e) { /* start fresh */ } finally { setLoaded(true); }
  }, []);
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { window.localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { console.error("Storage save failed", e); }
    }, 250);
    return () => clearTimeout(saveTimer.current);
  }, [data, loaded]);
  return [data, setData, loaded];
}

/* ============================================================================
   SMALL UI PRIMITIVES
   ============================================================================ */
function Card({ children, className = "", style }) {
  return <div className={`rounded-2xl border ${className}`} style={{ background: PALETTE.panel, borderColor: PALETTE.panelBorder, ...style }}>{children}</div>;
}
function IconBadge({ Icon, color }) {
  return <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 40, height: 40, background: `${color}1F`, color }}><Icon size={19} strokeWidth={2} /></div>;
}
function Button({ children, onClick, variant = "solid", className = "", type = "button", disabled }) {
  const base = "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100";
  const styles = {
    solid: { background: PALETTE.teal, color: "#06120E" },
    ghost: { background: "transparent", color: PALETTE.ink, border: `1px solid ${PALETTE.panelBorder}` },
    danger: { background: "transparent", color: PALETTE.coral, border: `1px solid ${PALETTE.coral}33` },
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${className}`} style={styles[variant]}>{children}</button>;
}
function Field({ label, children }) {
  return <label className="flex flex-col gap-1.5 text-sm"><span style={{ color: PALETTE.inkDim }}>{label}</span>{children}</label>;
}
const inputStyle = { background: PALETTE.bgSoft, border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.ink, borderRadius: 10, padding: "9px 12px", fontSize: 14, outline: "none" };
function TInput(props) { return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} className={`w-full ${props.className || ""}`} />; }
function TSelect(props) { return <select {...props} style={{ ...inputStyle, ...(props.style || {}) }} className={`w-full ${props.className || ""}`} />; }

/* ---- Comma-formatted numeric input (thousands separators as you type) ---- */
function formatNumberDisplay(raw) {
  if (raw === "" || raw == null) return "";
  const neg = String(raw).startsWith("-");
  let s = neg ? String(raw).slice(1) : String(raw);
  const [intPart, decPart] = s.split(".");
  const withCommas = (intPart || "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + withCommas + (decPart !== undefined ? "." + decPart : "");
}
function cleanNumberInput(display) {
  let v = String(display).replace(/,/g, "");
  v = v.replace(/[^0-9.\-]/g, "");
  v = v[0] === "-" ? "-" + v.slice(1).replace(/-/g, "") : v.replace(/-/g, "");
  const parts = v.split(".");
  if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
  return v;
}
function NumberInput({ value, onChange, placeholder, className = "", style, min, max }) {
  return (
    <input
      type="text" inputMode="decimal"
      value={formatNumberDisplay(value)}
      onChange={e => onChange(cleanNumberInput(e.target.value))}
      placeholder={placeholder}
      style={{ ...inputStyle, ...(style || {}) }}
      className={`w-full ${className}`}
    />
  );
}

// Amount input with an inline USD/IRT toggle. Always emits the FULL entered
// figure back — { usd, entered, currency } — so callers can store either the
// exact typed value (native-currency fields) or its USD equivalent, as needed.
function AmountField({ label, initialEntered, initialCurrency = "USD", onChange, rate, lang }) {
  const [currency, setCurrency] = useState(initialCurrency || "USD");
  const [raw, setRaw] = useState(initialEntered != null && initialEntered !== 0 ? String(initialEntered) : "");
  const emit = (rawStr, curr) => {
    const numeric = Number(rawStr) || 0;
    const usd = curr === "USD" ? numeric : numeric / (rate || 1);
    onChange({ usd, entered: numeric, currency: curr });
  };
  const switchCurrency = (next) => {
    if (next === currency) return;
    const numeric = Number(raw) || 0;
    const newRaw = next === "IRT" ? Math.round(numeric * (rate || 1)) : (numeric / (rate || 1));
    const newRawStr = newRaw ? String(newRaw) : "";
    setRaw(newRawStr); setCurrency(next);
    emit(newRawStr, next);
  };
  const handleChange = (v) => { setRaw(v); emit(v, currency); };
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <NumberInput value={raw} onChange={handleChange} className="flex-1" />
        <div className="flex rounded-lg overflow-hidden shrink-0" style={{ border: `1px solid ${PALETTE.panelBorder}` }}>
          {["USD", "IRT"].map(c => (
            <button key={c} type="button" onClick={() => switchCurrency(c)} className="px-2.5 text-xs font-medium"
              style={{ background: currency === c ? PALETTE.teal : "transparent", color: currency === c ? "#06120E" : PALETTE.inkDim }}>{c}</button>
          ))}
        </div>
      </div>
    </Field>
  );
}

function CategoryPicker({ value, onChange, lang, categories, label }) {
  return (
    <Field label={label}>
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(categories).map(([key, meta]) => {
          const Icon = meta.icon;
          const active = value === key;
          return (
            <button key={key} type="button" onClick={() => onChange(active ? null : key)}
              className="flex flex-col items-center gap-1 rounded-xl py-2 text-[10px]"
              style={{ background: active ? `${meta.color}22` : PALETTE.bgSoft, border: `1px solid ${active ? meta.color : PALETTE.panelBorder}`, color: active ? meta.color : PALETTE.inkDim }}>
              <Icon size={16} />{meta.label[lang]}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "#000A" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl p-5 max-h-[90vh] overflow-y-auto" style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.panelBorder}` }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: PALETTE.ink }}>{title}</h3>
          <button onClick={onClose} style={{ color: PALETTE.inkDim }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function StatChip({ value }) {
  const v = Number(value) || 0; const positive = v >= 0;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5"
      style={{ color: positive ? PALETTE.teal : PALETTE.coral, background: positive ? `${PALETTE.teal}17` : `${PALETTE.coral}17` }}>
      {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{pct(v)}
    </span>
  );
}
function LinearProgress({ percent, color = PALETTE.teal }) {
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: PALETTE.bgSoft }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(Math.max(percent, 0), 100)}%`, background: color }} />
    </div>
  );
}
function CircularProgress({ percent, size = 96, stroke = 10, color = PALETTE.teal }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(percent, 0), 100);
  const dash = (c * clamped) / 100;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={PALETTE.panelBorder} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dasharray 0.3s" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold" style={{ color: PALETTE.ink }}>{Math.round(clamped)}%</div>
    </div>
  );
}

/* ============================================================================
   DERIVED DATA HELPERS
   ============================================================================ */
function basketsTotal(baskets, rate) { return baskets.reduce((s, b) => s + toUSDValue(b.balance, b.nativeCurrency || "USD", rate), 0); }
function defiTotal(defiPositions, rate) { return defiPositions.reduce((s, p) => s + toUSDValue(p.balance, p.nativeCurrency || "USD", rate), 0); }
function totalNetWorth(data, rate) { return basketsTotal(data.baskets, rate) + defiTotal(data.defiPositions, rate); }

function computeHistory(data, rate) {
  const events = [];
  data.baskets.forEach(b => events.push({ date: b.createdAt, amount: toUSDValue(b.initialBalance, b.nativeCurrency || "USD", rate) }));
  data.defiPositions.forEach(p => events.push({ date: p.createdAt, amount: toUSDValue(p.initialBalance, p.nativeCurrency || "USD", rate) }));
  data.activities.forEach(a => { if (a.targetType === "basket" || a.targetType === "defi") events.push({ date: a.date, amount: Number(a.amount) || 0 }); });
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  const series = events.map(e => { running += e.amount; return { date: e.date, value: running }; });
  if (series.length === 0) series.push({ date: nowISO(), value: 0 });
  // Anchor the most recent point to the real current total (computed
  // directly from live balances) so the chart never disagrees with the
  // headline Net Worth figure, even if the replayed shape above is only
  // an approximation of the true historical path.
  series[series.length - 1] = { ...series[series.length - 1], value: totalNetWorth(data, rate) };
  return series;
}
function filterSeries(series, range) {
  const now = Date.now();
  const spans = { "7d": 7 * 864e5, "30d": 30 * 864e5, "365d": 365 * 864e5 };
  const cutoff = now - spans[range];
  const filtered = series.filter(p => new Date(p.date).getTime() >= cutoff);
  return filtered.length > 1 ? filtered : series.slice(-2);
}
function allTargets(data) {
  return [
    ...data.baskets.map(b => ({ id: b.id, name: b.name, type: "basket", category: b.category, balance: b.balance, nativeCurrency: b.nativeCurrency || "USD" })),
    ...data.defiPositions.map(p => ({ id: p.id, name: p.name, type: "defi", category: "defi", balance: p.balance, nativeCurrency: p.nativeCurrency || "USD" })),
  ];
}
function allTargetsExtended(data) {
  return [
    ...allTargets(data),
    ...data.loans.map(l => ({ id: l.id, name: l.name, type: "loan", category: "loan" })),
    ...data.goals.map(g => ({ id: g.id, name: g.name, type: "goal", category: "goal" })),
    ...data.debts.map(deb => ({ id: deb.id, name: deb.name, type: "debt", category: "debt" })),
  ];
}

/* ============================================================================
   SIDEBAR + HEADER
   ============================================================================ */
const NAV_ITEMS = [
  ["dashboard", LayoutDashboard], ["portfolio", Layers], ["wallets", Wallet], ["defi", Sparkles],
  ["trading", LineChart], ["loans", HandCoins], ["debts", Users], ["goals", Target],
  ["activity", History], ["settings", SettingsIcon],
];
function Sidebar({ view, setView, lang }) {
  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 px-4 py-6 border-r" style={{ borderColor: PALETTE.panelBorder }}>
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold" style={{ background: PALETTE.teal, color: "#06120E" }}>P</div>
        <div>
          <div className="text-sm font-semibold" style={{ color: PALETTE.ink }}>{t("appName", lang)}</div>
          <div className="text-[11px]" style={{ color: PALETTE.inkDim }}>{t("tagline", lang)}</div>
        </div>
      </div>
      <nav className="flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map(([key, Icon]) => {
          const active = view === key;
          return (
            <button key={key} onClick={() => setView(key)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: active ? `${PALETTE.teal}14` : "transparent", color: active ? PALETTE.teal : PALETTE.inkDim }}>
              <Icon size={17} />{STR.nav[key][lang]}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto text-[11px] px-2" style={{ color: PALETTE.inkDim }}>
        {lang === "en" ? "Everything stored on this device only." : "همه‌چیز فقط روی همین دستگاه ذخیره می‌شود."}
      </div>
    </aside>
  );
}
function MobileNav({ view, setView, lang }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex justify-start gap-1 py-2 overflow-x-auto border-t px-2" style={{ background: PALETTE.panel, borderColor: PALETTE.panelBorder }}>
      {NAV_ITEMS.map(([key, Icon]) => (
        <button key={key} onClick={() => setView(key)} className="flex flex-col items-center gap-0.5 px-2.5 py-1 shrink-0" style={{ color: view === key ? PALETTE.teal : PALETTE.inkDim }}>
          <Icon size={18} /><span className="text-[10px]">{STR.nav[key][lang]}</span>
        </button>
      ))}
    </nav>
  );
}
function Header({ lang, setLang, currency, setCurrency, view, rate, liveRate, onRefreshRate }) {
  const rateTitle = liveRate.error
    ? `${t("rateUnavailable", lang)} — ${liveRate.error}`
    : `${t("liveRateTitle", lang)}: ${fmtIRT(1, rate)}${liveRate.updatedAt ? " · " + new Date(liveRate.updatedAt).toLocaleTimeString(lang === "fa" ? "fa-IR" : "en-US") : ""}`;
  return (
    <header className="flex items-center justify-between px-5 md:px-8 py-5 sticky top-0 z-30 backdrop-blur" style={{ background: `${PALETTE.bg}E6`, borderBottom: `1px solid ${PALETTE.panelBorder}` }}>
      <h1 className="text-lg font-semibold capitalize" style={{ color: PALETTE.ink }}>{STR.nav[view] ? STR.nav[view][lang] : view}</h1>
      <div className="flex items-center gap-2">
        <button onClick={onRefreshRate} title={rateTitle} className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium"
          style={{ border: `1px solid ${liveRate.error ? `${PALETTE.coral}55` : PALETTE.panelBorder}`, color: liveRate.error ? PALETTE.coral : PALETTE.ink }}>
          <Coins size={14} style={{ color: PALETTE.amber }} />
          {liveRate.loading ? <RefreshCw size={12} className="animate-spin" /> : <span>{Math.round(rate).toLocaleString("en-US")}</span>}
        </button>
        <button onClick={() => setCurrency(c => c === "USD" ? "IRT" : "USD")} className="p-2 rounded-lg text-xs font-semibold w-12" style={{ border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.ink }}>{currency}</button>
        <button onClick={() => setLang(l => l === "en" ? "fa" : "en")} className="p-2 rounded-lg" style={{ border: `1px solid ${PALETTE.panelBorder}`, color: PALETTE.inkDim }} title={t("language", lang)}><Globe size={16} /></button>
      </div>
    </header>
  );
}

/* ============================================================================
   DASHBOARD VIEW
   ============================================================================ */
function DashboardView({ data, lang, currency, rate, openTxModal }) {
  const [range, setRange] = useState("30d");
  const net = totalNetWorth(data, rate);
  const history = useMemo(() => computeHistory(data, rate), [data, rate]);
  const shown = useMemo(() => filterSeries(history, range), [history, range]);
  const changePct = useMemo(() => {
    if (shown.length < 2) return 0;
    const first = shown[0].value || 1;
    return ((shown[shown.length - 1].value - first) / Math.abs(first)) * 100;
  }, [shown]);
  const byCategory = useMemo(() => {
    const map = {};
    data.baskets.forEach(b => { map[b.category] = (map[b.category] || 0) + toUSDValue(b.balance, b.nativeCurrency || "USD", rate); });
    const defiSum = defiTotal(data.defiPositions, rate);
    if (defiSum) map.defi = defiSum;
    return Object.entries(map).filter(([, v]) => v !== 0).map(([cat, value]) => ({ cat, value, color: categoryMeta(cat)?.color || "#888" }));
  }, [data.baskets, data.defiPositions, rate]);
  const defiMonthlyUSD = data.defiPositions.reduce((s, p) => s + toUSDValue(p.balance, p.nativeCurrency || "USD", rate) * (Number(p.apy) || 0) / 100 / 12, 0);
  const defiYearlyUSD = data.defiPositions.reduce((s, p) => s + toUSDValue(p.balance, p.nativeCurrency || "USD", rate) * (Number(p.apy) || 0) / 100, 0);
  const chartDate = d => new Date(d).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US", { month: "short", day: "numeric" });

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <div className="text-sm mb-2" style={{ color: PALETTE.inkDim }}>{t("totalNetWorth", lang)}</div>
            <div className="text-4xl md:text-5xl font-semibold tracking-tight" style={{ color: PALETTE.ink }}>{fmtMoney(net, currency, rate)}</div>
            <div className="mt-2"><StatChip value={changePct} /></div>
          </div>
          <div className="flex gap-2 self-start">
            {["7d", "30d", "365d"].map(r => (
              <button key={r} onClick={() => setRange(r)} className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: range === r ? PALETTE.teal : "transparent", color: range === r ? "#06120E" : PALETTE.inkDim, border: `1px solid ${range === r ? PALETTE.teal : PALETTE.panelBorder}` }}>
                {r === "7d" ? t("weekly", lang) : r === "30d" ? t("monthly", lang) : t("yearly", lang)}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 220, marginTop: 24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={shown}>
              <defs><linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={PALETTE.teal} stopOpacity={0.35} /><stop offset="100%" stopColor={PALETTE.teal} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke={PALETTE.panelBorder} strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="date" tickFormatter={chartDate} stroke={PALETTE.inkDim} fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
              <YAxis stroke={PALETTE.inkDim} fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => currency === "USD" ? `$${Math.round(v)}` : `${Math.round(v * rate / 1e6)}م`} width={56} />
              <Tooltip contentStyle={{ background: PALETTE.bgSoft, border: `1px solid ${PALETTE.panelBorder}`, borderRadius: 10, fontSize: 12, color: PALETTE.ink }} itemStyle={{ color: PALETTE.ink }} labelStyle={{ color: PALETTE.inkDim }} labelFormatter={chartDate} formatter={(v) => [fmtMoney(v, currency, rate), t("totalNetWorth", lang)]} />
              <Area type="monotone" dataKey="value" stroke={PALETTE.teal} strokeWidth={2} fill="url(#netGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-semibold mb-4" style={{ color: PALETTE.ink }}>{t("breakdown", lang)}</h3>
          {byCategory.length === 0 ? <div className="text-sm py-10 text-center" style={{ color: PALETTE.inkDim }}>{t("emptyBaskets", lang)}</div> : (
            <div className="flex items-center gap-6">
              <div style={{ width: 150, height: 150 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" nameKey="cat" innerRadius={45} outerRadius={70} paddingAngle={3} stroke="none">
                      {byCategory.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: PALETTE.bgSoft, border: `1px solid ${PALETTE.panelBorder}`, borderRadius: 10, fontSize: 12, color: PALETTE.ink }} itemStyle={{ color: PALETTE.ink }} labelStyle={{ color: PALETTE.inkDim }} formatter={(v, n) => [fmtMoney(v, currency, rate), catLabel(n, lang)]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                {byCategory.sort((a, b) => b.value - a.value).map(e => (
                  <div key={e.cat} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2" style={{ color: PALETTE.inkDim }}><span className="w-2 h-2 rounded-full" style={{ background: e.color }} />{catLabel(e.cat, lang)}</span>
                    <span style={{ color: PALETTE.ink }}>{net ? ((e.value / net) * 100).toFixed(1) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: PALETTE.ink }}><Sparkles size={15} style={{ color: PALETTE.amber }} /> {t("defiProjection", lang)}</h3>
          {data.defiPositions.length === 0 ? <div className="text-sm py-10 text-center" style={{ color: PALETTE.inkDim }}>{t("emptyDefi", lang)}</div> : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="rounded-xl p-4" style={{ background: PALETTE.bgSoft }}><div className="text-xs mb-1" style={{ color: PALETTE.inkDim }}>{t("monthly", lang)}</div><div className="text-xl font-semibold" style={{ color: PALETTE.amber }}>{fmtMoney(defiMonthlyUSD, currency, rate)}</div></div>
                <div className="rounded-xl p-4" style={{ background: PALETTE.bgSoft }}><div className="text-xs mb-1" style={{ color: PALETTE.inkDim }}>{t("yearly", lang)}</div><div className="text-xl font-semibold" style={{ color: PALETTE.amber }}>{fmtMoney(defiYearlyUSD, currency, rate)}</div></div>
              </div>
              <div className="flex flex-col gap-2">
                {data.defiPositions.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs"><span style={{ color: PALETTE.inkDim }}>{p.name}</span><span style={{ color: PALETTE.ink }}>{p.apy}% APY · {displayNative(p.balance, p.nativeCurrency, currency, rate)}</span></div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
      <div><Button onClick={openTxModal}><Plus size={16} />{t("addTx", lang)}</Button></div>
    </div>
  );
}

/* ============================================================================
   PORTFOLIO VIEW
   ============================================================================ */
function BasketCard({ basket, lang, currency, rate, onEdit, onDelete, onQuickTx }) {
  const meta = categoryMeta(basket.category);
  const Icon = meta.icon;
  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <IconBadge Icon={Icon} color={meta.color} />
          <div><div className="text-sm font-semibold" style={{ color: PALETTE.ink }}>{basket.name}</div><div className="text-[11px]" style={{ color: PALETTE.inkDim }}>{catLabel(basket.category, lang)} · {basket.nativeCurrency || "USD"}</div></div>
        </div>
        <div className="flex gap-1"><button onClick={() => onEdit(basket)} style={{ color: PALETTE.inkDim }}><Edit3 size={14} /></button><button onClick={confirmAnd(lang, () => onDelete(basket.id))} style={{ color: PALETTE.coral }}><Trash2 size={14} /></button></div>
      </div>
      <div className="text-2xl font-semibold" style={{ color: PALETTE.ink }}>{displayNative(basket.balance, basket.nativeCurrency, currency, rate)}</div>
      <div className="flex gap-2 mt-1">
        <Button variant="ghost" className="!py-1.5 !px-2.5 text-xs flex-1" onClick={() => onQuickTx(basket, "deposit")}><Plus size={13} />{t("deposit", lang)}</Button>
        <Button variant="ghost" className="!py-1.5 !px-2.5 text-xs flex-1" onClick={() => onQuickTx(basket, "withdraw")}><Minus size={13} />{t("withdraw", lang)}</Button>
      </div>
    </Card>
  );
}
function PortfolioView({ data, lang, currency, rate, openBasketModal, deleteBasket, openTxModal, openDefiModal, deleteDefi }) {
  const [filter, setFilter] = useState("all");
  const showBaskets = filter !== "defi";
  const showDefi = filter === "all" || filter === "defi";
  const baskets = filter === "all" || filter === "defi" ? data.baskets : data.baskets.filter(b => b.category === filter);
  const defiItems = showDefi ? data.defiPositions : [];
  const visibleBaskets = showBaskets ? baskets : [];
  const nothingToShow = visibleBaskets.length === 0 && defiItems.length === 0;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TSelect value={filter} onChange={e => setFilter(e.target.value)} style={{ width: "auto", minWidth: 180 }}>
          <option value="all">{t("allCategories", lang)}</option>
          {Object.keys(CATEGORY_META).map(cat => <option key={cat} value={cat}>{catLabel(cat, lang)}</option>)}
          <option value="defi">{catLabel("defi", lang)}</option>
        </TSelect>
        <Button onClick={() => openBasketModal(null)}><Plus size={16} />{t("addBasket", lang)}</Button>
      </div>
      {nothingToShow ? <Card className="p-10 text-center text-sm" style={{ color: PALETTE.inkDim }}>{t("emptyBaskets", lang)}</Card> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleBaskets.map(b => <BasketCard key={b.id} basket={b} lang={lang} currency={currency} rate={rate} onEdit={openBasketModal} onDelete={deleteBasket} onQuickTx={(basket, type) => openTxModal(basket, "basket", type)} />)}
          {defiItems.map(p => (
            <DefiPositionCard key={p.id} position={p} wallet={data.baskets.find(b => b.id === p.walletId)} lang={lang} currency={currency} rate={rate}
              onEdit={openDefiModal} onDelete={deleteDefi} onQuickTx={(pos, type) => openTxModal(pos, "defi", type)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   WALLETS VIEW
   ============================================================================ */
function WalletsView({ data, lang, currency, rate, openBasketModal, deleteBasket, openTxModal }) {
  const wallets = data.baskets.filter(b => b.category === "hotWallet" || b.category === "coldWallet");
  return (
    <div className="flex flex-col gap-5">
      <Card className="p-4 text-xs" style={{ color: PALETTE.inkDim }}>{t("connectAddressHint", lang)}</Card>
      <div className="flex justify-end"><Button onClick={() => openBasketModal(null, "hotWallet")}><Plus size={16} />{t("addBasket", lang)}</Button></div>
      {wallets.length === 0 ? <Card className="p-10 text-center text-sm" style={{ color: PALETTE.inkDim }}>{t("emptyBaskets", lang)}</Card> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map(w => {
            const meta = categoryMeta(w.category);
            const chainLabel = CHAIN_OPTIONS.find(c => c.id === w.chain)?.label || w.chain || "—";
            return (
              <Card key={w.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconBadge Icon={meta.icon} color={meta.color} />
                    <div><div className="text-sm font-semibold" style={{ color: PALETTE.ink }}>{w.name}</div><div className="text-[11px] font-mono" style={{ color: PALETTE.inkDim }}>{w.address ? `${w.address.slice(0, 6)}…${w.address.slice(-4)} · ` : ""}{chainLabel} · {w.nativeCurrency || "USD"}</div></div>
                  </div>
                  <div className="flex gap-1"><button onClick={() => openBasketModal(w)} style={{ color: PALETTE.inkDim }}><Edit3 size={14} /></button><button onClick={confirmAnd(lang, () => deleteBasket(w.id))} style={{ color: PALETTE.coral }}><Trash2 size={14} /></button></div>
                </div>
                <div className="text-2xl font-semibold" style={{ color: PALETTE.ink }}>{displayNative(w.balance, w.nativeCurrency, currency, rate)}</div>
                <div className="flex gap-2">
                  <Button variant="ghost" className="text-xs !py-1.5 flex-1" onClick={() => openTxModal(w, "basket", "deposit")}><Plus size={13} />{t("deposit", lang)}</Button>
                  <Button variant="ghost" className="text-xs !py-1.5 flex-1" onClick={() => openTxModal(w, "basket", "withdraw")}><Minus size={13} />{t("withdraw", lang)}</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   DEFI VIEW
   ============================================================================ */
function DefiPositionCard({ position, wallet, lang, currency, rate, onEdit, onDelete, onQuickTx }) {
  const monthlyNative = (Number(position.balance) || 0) * (Number(position.apy) || 0) / 100 / 12;
  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3"><IconBadge Icon={DEFI_META.icon} color={DEFI_META.color} /><div><div className="text-sm font-semibold" style={{ color: PALETTE.ink }}>{position.name}</div><div className="text-[11px]" style={{ color: PALETTE.inkDim }}>{t("connectedWallet", lang)}: {wallet?.name || "—"} · {position.nativeCurrency || "USD"}</div></div></div>
        <div className="flex gap-1"><button onClick={() => onEdit(position)} style={{ color: PALETTE.inkDim }}><Edit3 size={14} /></button><button onClick={confirmAnd(lang, () => onDelete(position.id))} style={{ color: PALETTE.coral }}><Trash2 size={14} /></button></div>
      </div>
      <div className="text-2xl font-semibold" style={{ color: PALETTE.ink }}>{displayNative(position.balance, position.nativeCurrency, currency, rate)}</div>
      <div className="text-xs" style={{ color: PALETTE.amber }}>{position.apy}% APY · {displayNative(monthlyNative, position.nativeCurrency, currency, rate)}/mo</div>
      <div className="flex gap-2">
        <Button variant="ghost" className="text-xs !py-1.5 flex-1" onClick={() => onQuickTx(position, "deposit")}><Plus size={13} />{t("deposit", lang)}</Button>
        <Button variant="ghost" className="text-xs !py-1.5 flex-1" onClick={() => onQuickTx(position, "withdraw")}><Minus size={13} />{t("withdraw", lang)}</Button>
      </div>
    </Card>
  );
}
function DefiView({ data, lang, currency, rate, openDefiModal, deleteDefi, openTxModal }) {
  const wallets = data.baskets.filter(b => b.category === "hotWallet" || b.category === "coldWallet");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end"><Button onClick={() => openDefiModal(null)} disabled={wallets.length === 0}><Plus size={16} />{t("addDefi", lang)}</Button></div>
      {wallets.length === 0 && <Card className="p-4 text-xs" style={{ color: PALETTE.amber }}>{t("needsWalletFirst", lang)}</Card>}
      {data.defiPositions.length === 0 ? <Card className="p-10 text-center text-sm" style={{ color: PALETTE.inkDim }}>{t("emptyDefi", lang)}</Card> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.defiPositions.map(p => (
            <DefiPositionCard key={p.id} position={p} wallet={data.baskets.find(b => b.id === p.walletId)} lang={lang} currency={currency} rate={rate}
              onEdit={openDefiModal} onDelete={deleteDefi} onQuickTx={(pos, type) => openTxModal(pos, "defi", type)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   LOANS VIEW
   ============================================================================ */
function LoanCard({ loan, lang, currency, rate, onEdit, onDelete, onPay }) {
  const nc = loan.nativeCurrency || "USD";
  const monthly = loanMonthlyPayment(loan.principal, loan.apy, loan.months);
  const totalOwed = monthly * loan.months;
  const paid = Number(loan.amountPaid) || 0;
  const percent = totalOwed > 0 ? (paid / totalOwed) * 100 : 0;
  const paidOff = percent >= 100;
  const due = loanNextDueDate(loan);
  const daysLeft = Math.ceil((due - new Date()) / 864e5);
  const monthsPaidCount = (loan.payments || []).length;
  const urgentColor = daysLeft <= 3 ? PALETTE.coral : daysLeft <= 7 ? PALETTE.amber : PALETTE.teal;
  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <IconBadge Icon={LOAN_META.icon} color={LOAN_META.color} />
          <div><div className="text-sm font-semibold" style={{ color: PALETTE.ink }}>{loan.name}</div><div className="text-[11px]" style={{ color: PALETTE.inkDim }}>{loan.apy}% APY · {loan.months}mo · {nc}</div></div>
        </div>
        <div className="flex items-center gap-2">
          {paidOff && <span className="text-[10px] font-medium rounded-full px-2 py-0.5" style={{ background: `${PALETTE.teal}22`, color: PALETTE.teal }}>{t("paidOff", lang)}</span>}
          <button onClick={() => onEdit(loan)} style={{ color: PALETTE.inkDim }}><Edit3 size={14} /></button>
          <button onClick={confirmAnd(lang, () => onDelete(loan.id))} style={{ color: PALETTE.coral }}><Trash2 size={14} /></button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div><div style={{ color: PALETTE.inkDim }}>{t("monthlyPayment", lang)}</div><div className="text-base font-semibold" style={{ color: PALETTE.ink }}>{displayNative(monthly, nc, currency, rate)}</div></div>
        <div><div style={{ color: PALETTE.inkDim }}>{t("remaining", lang)}</div><div className="text-base font-semibold" style={{ color: PALETTE.ink }}>{displayNative(Math.max(totalOwed - paid, 0), nc, currency, rate)}</div></div>
      </div>
      <div>
        <div className="flex justify-between text-[11px] mb-1" style={{ color: PALETTE.inkDim }}><span>{Math.round(percent)}% {t("paidSoFar", lang)}</span><span>{monthsPaidCount}/{loan.months} {t("monthsPaid", lang)}</span></div>
        <LinearProgress percent={percent} color={PALETTE.teal} />
      </div>
      {!paidOff && (
        <div className="flex items-center justify-between text-xs pt-2 border-t" style={{ borderColor: PALETTE.panelBorder }}>
          <span style={{ color: PALETTE.inkDim }}>{t("nextDue", lang)}: {due.toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US")}</span>
          <span className="font-medium" style={{ color: urgentColor }}>{daysLeft < 0 ? t("overdue", lang) : `${daysLeft} ${t("daysLeft", lang)}`}</span>
        </div>
      )}
      {!paidOff && <Button variant="ghost" className="text-xs !py-1.5" onClick={() => onPay(loan)}><Plus size={13} />{t("logPayment", lang)}</Button>}
    </Card>
  );
}
function LoansView({ data, lang, currency, rate, openLoanModal, deleteLoan, openPayModal }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end"><Button onClick={() => openLoanModal(null)}><Plus size={16} />{t("addLoan", lang)}</Button></div>
      {data.loans.length === 0 ? <Card className="p-10 text-center text-sm" style={{ color: PALETTE.inkDim }}>{t("emptyLoans", lang)}</Card> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.loans.map(l => <LoanCard key={l.id} loan={l} lang={lang} currency={currency} rate={rate} onEdit={openLoanModal} onDelete={deleteLoan} onPay={openPayModal} />)}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   DEBTOR & CREDITOR VIEW — people who owe you, and people you owe
   ============================================================================ */
function DebtCard({ debt, lang, currency, rate, onEdit, onDelete, onPay }) {
  const nc = debt.nativeCurrency || "USD";
  const total = Number(debt.amount) || 0;
  const paid = Number(debt.paidAmount) || 0;
  const remaining = Math.max(total - paid, 0);
  const percent = total > 0 ? (paid / total) * 100 : 0;
  const settled = percent >= 100;
  const isOwedToMe = debt.type === "owed_to_me";
  const color = isOwedToMe ? PALETTE.teal : PALETTE.coral;
  const DirIcon = isOwedToMe ? ArrowDownRight : ArrowUpRight;
  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <IconBadge Icon={DirIcon} color={color} />
          <div>
            <div className="text-sm font-semibold" style={{ color: PALETTE.ink }}>{debt.name}</div>
            <div className="text-[11px]" style={{ color: PALETTE.inkDim }}>{isOwedToMe ? t("owedToMe", lang) : t("iOwe", lang)} · {nc}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {settled && <span className="text-[10px] font-medium rounded-full px-2 py-0.5" style={{ background: `${PALETTE.teal}22`, color: PALETTE.teal }}>{t("paidOff", lang)}</span>}
          <button onClick={() => onEdit(debt)} style={{ color: PALETTE.inkDim }}><Edit3 size={14} /></button>
          <button onClick={confirmAnd(lang, () => onDelete(debt.id))} style={{ color: PALETTE.coral }}><Trash2 size={14} /></button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div><div style={{ color: PALETTE.inkDim }}>{t("totalAmount", lang)}</div><div className="text-base font-semibold" style={{ color: PALETTE.ink }}>{displayNative(total, nc, currency, rate)}</div></div>
        <div><div style={{ color: PALETTE.inkDim }}>{t("remaining", lang)}</div><div className="text-base font-semibold" style={{ color: PALETTE.ink }}>{displayNative(remaining, nc, currency, rate)}</div></div>
      </div>
      <div>
        <div className="flex justify-between text-[11px] mb-1" style={{ color: PALETTE.inkDim }}><span>{Math.round(percent)}% {t("paidSoFar", lang)}</span></div>
        <LinearProgress percent={percent} color={color} />
      </div>
      {debt.note && <div className="text-[11px]" style={{ color: PALETTE.inkDim }}>{debt.note}</div>}
      {!settled && <Button variant="ghost" className="text-xs !py-1.5" onClick={() => onPay(debt)}><Plus size={13} />{t("logPayment", lang)}</Button>}
    </Card>
  );
}
function DebtsView({ data, lang, currency, rate, openDebtModal, deleteDebt, openPayModal }) {
  const [filter, setFilter] = useState("all");
  const debts = filter === "all" ? data.debts : data.debts.filter(deb => deb.type === filter);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {["all", "owed_to_me", "i_owe"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: filter === f ? PALETTE.teal : "transparent", color: filter === f ? "#06120E" : PALETTE.inkDim, border: `1px solid ${filter === f ? PALETTE.teal : PALETTE.panelBorder}` }}>
              {f === "all" ? t("allCategories", lang) : f === "owed_to_me" ? t("owedToMe", lang) : t("iOwe", lang)}
            </button>
          ))}
        </div>
        <Button onClick={() => openDebtModal(null)}><Plus size={16} />{t("addDebt", lang)}</Button>
      </div>
      {debts.length === 0 ? <Card className="p-10 text-center text-sm" style={{ color: PALETTE.inkDim }}>{t("emptyDebts", lang)}</Card> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {debts.map(deb => <DebtCard key={deb.id} debt={deb} lang={lang} currency={currency} rate={rate} onEdit={openDebtModal} onDelete={deleteDebt} onPay={openPayModal} />)}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   GOALS VIEW
   ============================================================================ */
function GoalCard({ goal, lang, currency, rate, onEdit, onDelete, onTx }) {
  const nc = goal.nativeCurrency || "USD";
  const percent = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  return (
    <Card className="p-4 flex flex-col items-center gap-3 text-center">
      <div className="w-full flex items-start justify-between">
        <IconBadge Icon={GOAL_META.icon} color={GOAL_META.color} />
        <div className="flex gap-1"><button onClick={() => onEdit(goal)} style={{ color: PALETTE.inkDim }}><Edit3 size={14} /></button><button onClick={confirmAnd(lang, () => onDelete(goal.id))} style={{ color: PALETTE.coral }}><Trash2 size={14} /></button></div>
      </div>
      <CircularProgress percent={percent} color={GOAL_META.color} />
      <div><div className="text-sm font-semibold" style={{ color: PALETTE.ink }}>{goal.name}</div>
        <div className="text-[11px]" style={{ color: PALETTE.inkDim }}>{displayNative(goal.currentAmount, nc, currency, rate)} / {displayNative(goal.targetAmount, nc, currency, rate)}</div>
      </div>
      <div className="flex gap-2 w-full">
        <Button variant="ghost" className="text-xs !py-1.5 flex-1" onClick={() => onTx(goal, "deposit")}><Plus size={13} />{t("contribute", lang)}</Button>
        <Button variant="ghost" className="text-xs !py-1.5 flex-1" onClick={() => onTx(goal, "withdraw")}><Minus size={13} />{t("withdraw", lang)}</Button>
      </div>
    </Card>
  );
}
function GoalsView({ data, lang, currency, rate, openGoalModal, deleteGoal, openGoalTxModal }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end"><Button onClick={() => openGoalModal(null)}><Plus size={16} />{t("addGoal", lang)}</Button></div>
      {data.goals.length === 0 ? <Card className="p-10 text-center text-sm" style={{ color: PALETTE.inkDim }}>{t("emptyGoals", lang)}</Card> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.goals.map(g => <GoalCard key={g.id} goal={g} lang={lang} currency={currency} rate={rate} onEdit={openGoalModal} onDelete={deleteGoal} onTx={openGoalTxModal} />)}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   TRADING VIEW — first tool: Risk Management Calculator.
   Built as a small extensible list so more trading tools can slot in later.
   ============================================================================ */
function RiskCalculator({ rate, lang }) {
  const [capitalMeta, setCapitalMeta] = useState({ usd: 0, entered: 0, currency: "USD" });
  const [entry, setEntry] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [riskPct, setRiskPct] = useState("");
  const [leverage, setLeverage] = useState("");
  const [entryFee, setEntryFee] = useState("");
  const [exitFee, setExitFee] = useState("");

  // riskPct * capital = (stopPct * leverage * positionSize) + (leverage * positionSize * (entryFee% + exitFee%))
  // => positionSize = (riskPct * capital) / (leverage * (stopPct + entryFee% + exitFee%))
  const entryNum = Number(entry) || 0;
  const stopNum = Number(stopLoss) || 0;
  const riskFrac = (Number(riskPct) || 0) / 100;
  const levNum = Number(leverage) || 0;
  const feeFrac = ((Number(entryFee) || 0) + (Number(exitFee) || 0)) / 100;
  const stopDistance = entryNum > 0 ? Math.abs(entryNum - stopNum) / entryNum : 0;
  const riskAmount = riskFrac * capitalMeta.entered;
  const denom = levNum * (stopDistance + feeFrac);
  const positionSize = denom > 0 ? riskAmount / denom : 0; // in capitalMeta.currency terms
  const notional = positionSize * levNum;
  const units = entryNum > 0 ? notional / entryNum : 0;
  const nc = capitalMeta.currency;

  return (
    <Card className="p-6 flex flex-col gap-4">
      <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: PALETTE.ink }}>
        <Calculator size={16} style={{ color: PALETTE.amber }} />{t("riskCalculator", lang)}
      </h3>
      <p className="text-xs" style={{ color: PALETTE.inkDim }}>{t("riskCalcHint", lang)}</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <AmountField label={t("totalCapital", lang)} onChange={setCapitalMeta} rate={rate} lang={lang} />
        <Field label={t("riskPercent", lang)}><NumberInput value={riskPct} onChange={setRiskPct} placeholder="2" /></Field>
        <Field label={t("entryPoint", lang)}><NumberInput value={entry} onChange={setEntry} placeholder="0" /></Field>
        <Field label={t("stopLossPoint", lang)}><NumberInput value={stopLoss} onChange={setStopLoss} placeholder="0" /></Field>
        <Field label={t("leverage", lang)}><NumberInput value={leverage} onChange={setLeverage} placeholder="10" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("entryFeePercent", lang)}><NumberInput value={entryFee} onChange={setEntryFee} placeholder="0.05" /></Field>
          <Field label={t("exitFeePercent", lang)}><NumberInput value={exitFee} onChange={setExitFee} placeholder="0.05" /></Field>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: PALETTE.panelBorder }}>
        <div className="rounded-xl p-4" style={{ background: PALETTE.bgSoft }}>
          <div className="text-xs mb-1" style={{ color: PALETTE.inkDim }}>{t("positionSizeCurrency", lang)}</div>
          <div className="text-xl font-semibold" style={{ color: PALETTE.teal }}>{fmtExact(positionSize, nc)}</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: PALETTE.bgSoft }}>
          <div className="text-xs mb-1" style={{ color: PALETTE.inkDim }}>{t("positionSizeUnits", lang)}</div>
          <div className="text-xl font-semibold" style={{ color: PALETTE.teal }}>{units.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
        </div>
        <div className="text-xs flex justify-between px-1"><span style={{ color: PALETTE.inkDim }}>{t("riskAmount", lang)}</span><span style={{ color: PALETTE.ink }}>{fmtExact(riskAmount, nc)}</span></div>
        <div className="text-xs flex justify-between px-1"><span style={{ color: PALETTE.inkDim }}>{t("notionalExposure", lang)}</span><span style={{ color: PALETTE.ink }}>{fmtExact(notional, nc)}</span></div>
        <div className="text-xs flex justify-between px-1 sm:col-span-2"><span style={{ color: PALETTE.inkDim }}>{t("stopDistance", lang)}</span><span style={{ color: PALETTE.ink }}>{(stopDistance * 100).toFixed(2)}%</span></div>
      </div>
    </Card>
  );
}
function TradingView({ rate, lang }) {
  // Single tool for now; add more cards here as the Trading section grows.
  return (
    <div className="flex flex-col gap-5">
      <RiskCalculator rate={rate} lang={lang} />
    </div>
  );
}

/* ============================================================================
   ACTIVITY VIEW (List + categorized Breakdown)
   ============================================================================ */
function ActivityRow({ a, target, currency, rate, lang, onEdit, onDelete }) {
  const catMeta = a.txCategory ? txCategoryMeta(a.txCategory) : null;
  const Icon = catMeta ? catMeta.icon : (a.type === "deposit" ? Plus : a.type === "withdraw" ? Minus : a.type === "transfer" ? ArrowLeftRight : Sparkles);
  const color = catMeta ? catMeta.color : (Number(a.amount) >= 0 ? PALETTE.teal : PALETTE.coral);
  const positive = Number(a.amount) >= 0;
  const dCurrency = a.displayCurrency || "USD";
  const dAmount = a.displayAmount != null ? a.displayAmount : a.amount;
  const amountText = dCurrency === currency ? fmtExact(dAmount, currency) : fmtMoney(a.amount, currency, rate);
  const editable = a.targetType === "basket" || a.targetType === "defi";
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        <IconBadge Icon={Icon} color={color} />
        <div>
          <div className="text-sm font-medium" style={{ color: PALETTE.ink }}>
            {t(a.type, lang)} · {target ? target.name : catLabel(a.category, lang)}
            {catMeta && <span className="ml-1.5" style={{ color: catMeta.color }}>· {catMeta.label[lang]}</span>}
          </div>
          <div className="text-[11px]" style={{ color: PALETTE.inkDim }}>{new Date(a.date).toLocaleString(lang === "fa" ? "fa-IR" : "en-US")}{a.note ? ` · ${a.note}` : ""}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <div className="text-sm font-semibold" style={{ color: positive ? PALETTE.teal : PALETTE.coral }}>{positive ? "+" : ""}{amountText}</div>
          <div className="text-[11px]" style={{ color: PALETTE.inkDim }}>{pct(a.pctOfTotal)} {t("relativeToTotal", lang)}</div>
        </div>
        <div className="flex flex-col gap-1">
          {editable ? <button onClick={() => onEdit(a)} style={{ color: PALETTE.inkDim }}><Edit3 size={13} /></button> : <span style={{ width: 13 }} />}
          <button onClick={confirmAnd(lang, () => onDelete(a.id))} style={{ color: PALETTE.coral }}><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  );
}
function ActivityBreakdown({ data, lang, currency, rate }) {
  const [range, setRange] = useState("30d");
  const spans = { "7d": 7 * 864e5, "30d": 30 * 864e5, "365d": 365 * 864e5 };
  const cutoff = Date.now() - spans[range];
  // Transfers move money between your own accounts — they don't change
  // your balance, so they're excluded from expense/income totals here
  // (they still show up in the Activity list).
  const inRange = data.activities.filter(a => new Date(a.date).getTime() >= cutoff && a.type !== "transfer");
  const expenses = inRange.filter(a => Number(a.amount) < 0);
  const income = inRange.filter(a => Number(a.amount) > 0);
  const groupBy = (arr) => {
    const map = {};
    arr.forEach(a => { const key = a.txCategory || "others"; map[key] = (map[key] || 0) + Math.abs(Number(a.amount) || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };
  const expenseGroups = groupBy(expenses);
  const incomeGroups = groupBy(income);
  const totalExpense = expenses.reduce((s, a) => s + Math.abs(Number(a.amount) || 0), 0);
  const totalIncome = income.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const maxExpense = expenseGroups[0]?.[1] || 1;
  const maxIncome = incomeGroups[0]?.[1] || 1;

  const Group = ({ title, groups, max, total }) => (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: PALETTE.ink }}>{title}</h3>
        <span className="text-sm font-semibold" style={{ color: PALETTE.ink }}>{fmtMoney(total, currency, rate)}</span>
      </div>
      {groups.length === 0 ? <div className="text-sm py-6 text-center" style={{ color: PALETTE.inkDim }}>{t("noData", lang)}</div> : (
        <div className="flex flex-col gap-3">
          {groups.map(([key, value]) => {
            const meta = txCategoryMeta(key) || TX_CATEGORIES.others;
            const Icon = meta.icon;
            return (
              <div key={key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2" style={{ color: PALETTE.ink }}><Icon size={13} style={{ color: meta.color }} />{meta.label[lang]}</span>
                  <span style={{ color: PALETTE.inkDim }}>{fmtMoney(value, currency, rate)} · {total ? ((value / total) * 100).toFixed(0) : 0}%</span>
                </div>
                <LinearProgress percent={(value / max) * 100} color={meta.color} />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        {["7d", "30d", "365d"].map(r => (
          <button key={r} onClick={() => setRange(r)} className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: range === r ? PALETTE.teal : "transparent", color: range === r ? "#06120E" : PALETTE.inkDim, border: `1px solid ${range === r ? PALETTE.teal : PALETTE.panelBorder}` }}>
            {r === "7d" ? t("weekly", lang) : r === "30d" ? t("monthly", lang) : t("yearly", lang)}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <Group title={t("expenses", lang)} groups={expenseGroups} max={maxExpense} total={totalExpense} />
        <Group title={t("income", lang)} groups={incomeGroups} max={maxIncome} total={totalIncome} />
      </div>
    </div>
  );
}
function ActivityView({ data, lang, currency, rate, openEditActivity, deleteActivity }) {
  const [tab, setTab] = useState("list");
  const [filterCat, setFilterCat] = useState("all");
  const [filterTarget, setFilterTarget] = useState("all");
  const targets = useMemo(() => allTargetsExtended(data), [data]);
  const rows = useMemo(() => {
    return [...data.activities]
      .filter(a => filterCat === "all" || a.txCategory === filterCat)
      .filter(a => filterTarget === "all" || a.targetId === filterTarget)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data.activities, filterCat, filterTarget]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        <button onClick={() => setTab("list")} className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5" style={{ background: tab === "list" ? PALETTE.teal : "transparent", color: tab === "list" ? "#06120E" : PALETTE.inkDim, border: `1px solid ${tab === "list" ? PALETTE.teal : PALETTE.panelBorder}` }}><List size={13} />{t("listView", lang)}</button>
        <button onClick={() => setTab("breakdown")} className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5" style={{ background: tab === "breakdown" ? PALETTE.teal : "transparent", color: tab === "breakdown" ? "#06120E" : PALETTE.inkDim, border: `1px solid ${tab === "breakdown" ? PALETTE.teal : PALETTE.panelBorder}` }}><PieChartIcon size={13} />{t("breakdownView", lang)}</button>
      </div>
      {tab === "breakdown" ? <ActivityBreakdown data={data} lang={lang} currency={currency} rate={rate} /> : (
        <>
          <div className="flex flex-wrap gap-3">
            <TSelect value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width: "auto" }}>
              <option value="all">{t("allCategories", lang)}</option>
              <optgroup label={t("expenses", lang)}>
                {Object.keys(TX_CATEGORIES).map(c => <option key={c} value={c}>{txCatLabel(c, lang)}</option>)}
              </optgroup>
              <optgroup label={t("income", lang)}>
                {Object.keys(DEPOSIT_CATEGORIES).map(c => <option key={c} value={c}>{depositCatLabel(c, lang)}</option>)}
              </optgroup>
            </TSelect>
            <TSelect value={filterTarget} onChange={e => setFilterTarget(e.target.value)} style={{ width: "auto" }}>
              <option value="all">{t("selectBasket", lang)}</option>
              {targets.map(target => <option key={target.id} value={target.id}>{target.name}</option>)}
            </TSelect>
          </div>
          <Card className="divide-y" style={{ borderColor: PALETTE.panelBorder }}>
            {rows.length === 0 ? <div className="p-10 text-center text-sm" style={{ color: PALETTE.inkDim }}>{t("noData", lang)}</div> : rows.map(a => (
              <ActivityRow key={a.id} a={a} target={targets.find(x => x.id === a.targetId)} currency={currency} rate={rate} lang={lang} onEdit={openEditActivity} onDelete={deleteActivity} />
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

/* ============================================================================
   SETTINGS VIEW
   ============================================================================ */
function SettingsView({ data, setData, lang, setLang, currency, setCurrency, onExportBackup, onImportBackup }) {
  const fileInputRef = useRef(null);
  const [importMsg, setImportMsg] = useState(null);
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!window.confirm(t("importConfirm", lang))) return;
    try { await onImportBackup(file); setImportMsg({ type: "success", text: t("importSuccess", lang) }); }
    catch (err) { console.error("Import failed", err); setImportMsg({ type: "error", text: t("importError", lang) }); }
  };
  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <Card className="p-5 flex flex-col gap-4">
        <Field label={t("language", lang)}>
          <div className="flex gap-2">{["en", "fa"].map(l => (
            <button key={l} onClick={() => setLang(l)} className="flex-1 py-2 rounded-lg text-sm" style={{ background: lang === l ? PALETTE.teal : PALETTE.bgSoft, color: lang === l ? "#06120E" : PALETTE.ink }}>{l === "en" ? "English" : "فارسی"}</button>
          ))}</div>
        </Field>
        <Field label={t("currency", lang)}>
          <div className="flex gap-2">{["USD", "IRT"].map(c => (
            <button key={c} onClick={() => setCurrency(c)} className="flex-1 py-2 rounded-lg text-sm" style={{ background: currency === c ? PALETTE.teal : PALETTE.bgSoft, color: currency === c ? "#06120E" : PALETTE.ink }}>{c}</button>
          ))}</div>
        </Field>
        <Field label={t("usdtRate", lang)}>
          <NumberInput value={String(data.settings.usdtToIrt)} onChange={v => setData(d => ({ ...d, settings: { ...d.settings, usdtToIrt: Number(v) || 0 } }))} />
        </Field>
      </Card>
      <Card className="p-5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold" style={{ color: PALETTE.ink }}>{t("backupRestore", lang)}</h3>
        <p className="text-xs" style={{ color: PALETTE.inkDim }}>{t("backupHint", lang)}</p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onExportBackup}><Download size={14} />{t("exportBackup", lang)}</Button>
          <Button variant="ghost" onClick={() => fileInputRef.current?.click()}><Upload size={14} />{t("importBackup", lang)}</Button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
        </div>
        {importMsg && <div className="text-[11px]" style={{ color: importMsg.type === "success" ? PALETTE.teal : PALETTE.coral }}>{importMsg.text}</div>}
      </Card>
    </div>
  );
}

/* ============================================================================
   MODALS
   ============================================================================ */
function BasketModal({ initial, defaultCategory, rate, onSave, onClose, lang }) {
  const [form, setForm] = useState(initial
    ? { ...initial }
    : { name: "", category: defaultCategory || "bank", balance: 0, nativeCurrency: "USD", address: "", chain: "ethereum" });
  const isWallet = form.category === "hotWallet" || form.category === "coldWallet";
  return (
    <Modal title={initial ? t("edit", lang) : t("addBasket", lang)} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Field label={t("name", lang)}><TInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label={t("category", lang)}><TSelect value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{Object.keys(CATEGORY_META).map(c => <option key={c} value={c}>{catLabel(c, lang)}</option>)}</TSelect></Field>
        <AmountField label={t("amount", lang)} initialEntered={initial?.balance} initialCurrency={initial?.nativeCurrency || "USD"} onChange={v => setForm({ ...form, balance: v.entered, nativeCurrency: v.currency })} rate={rate} lang={lang} />
        {isWallet && (
          <>
            <Field label={t("walletAddress", lang)}><TInput value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="0x… / bc1…" /></Field>
            <Field label={t("chain", lang)}><TSelect value={form.chain || "ethereum"} onChange={e => setForm({ ...form, chain: e.target.value })}>{CHAIN_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</TSelect></Field>
          </>
        )}
        <p className="text-[11px]" style={{ color: PALETTE.inkDim }}>{t("nativeCurrencyNote", lang)}</p>
        <div className="flex gap-2 mt-2"><Button onClick={() => onSave(form)}>{t("save", lang)}</Button><Button variant="ghost" onClick={onClose}>{t("cancel", lang)}</Button></div>
      </div>
    </Modal>
  );
}
function DefiModal({ initial, wallets, rate, onSave, onClose, lang }) {
  const [form, setForm] = useState(initial
    ? { ...initial, apy: initial.apy != null ? String(initial.apy) : "" }
    : { name: "", walletId: wallets[0]?.id || "", balance: 0, nativeCurrency: "USD", apy: "" });
  return (
    <Modal title={initial ? t("edit", lang) : t("addDefi", lang)} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Field label={t("name", lang)}><TInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Aave USDC lending" /></Field>
        <Field label={t("connectedWallet", lang)}><TSelect value={form.walletId} onChange={e => setForm({ ...form, walletId: e.target.value })}>{wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</TSelect></Field>
        <AmountField label={t("amount", lang)} initialEntered={initial?.balance} initialCurrency={initial?.nativeCurrency || "USD"} onChange={v => setForm({ ...form, balance: v.entered, nativeCurrency: v.currency })} rate={rate} lang={lang} />
        <Field label={t("apy", lang)}><NumberInput value={form.apy} onChange={v => setForm({ ...form, apy: v })} placeholder="0" /></Field>
        <div className="flex gap-2 mt-2"><Button onClick={() => onSave({ ...form, apy: Number(form.apy) || 0 })} disabled={!form.walletId || !form.name}>{t("save", lang)}</Button><Button variant="ghost" onClick={onClose}>{t("cancel", lang)}</Button></div>
      </div>
    </Modal>
  );
}
function LoanModal({ initial, rate, onSave, onClose, lang }) {
  const [form, setForm] = useState(initial
    ? { ...initial, apy: String(initial.apy ?? ""), months: String(initial.months ?? ""), dueDay: String(initial.dueDay ?? "") }
    : { name: "", principal: 0, nativeCurrency: "USD", apy: "", months: "", dueDay: "" });
  return (
    <Modal title={initial ? t("edit", lang) : t("addLoan", lang)} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Field label={t("name", lang)}><TInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
        <AmountField label={t("principal", lang)} initialEntered={initial?.principal} initialCurrency={initial?.nativeCurrency || "USD"} onChange={v => setForm({ ...form, principal: v.entered, nativeCurrency: v.currency })} rate={rate} lang={lang} />
        <Field label={t("apy", lang)}><NumberInput value={form.apy} onChange={v => setForm({ ...form, apy: v })} placeholder="0" /></Field>
        <Field label={t("months", lang)}><NumberInput value={form.months} onChange={v => setForm({ ...form, months: v })} placeholder="12" /></Field>
        <Field label={t("dueDay", lang)}><NumberInput value={form.dueDay} onChange={v => setForm({ ...form, dueDay: v })} placeholder="1" /></Field>
        <div className="flex gap-2 mt-2"><Button onClick={() => onSave({ ...form, apy: Number(form.apy) || 0, months: Number(form.months) || 1, dueDay: Number(form.dueDay) || 1 })} disabled={!form.name || !form.principal}>{t("save", lang)}</Button><Button variant="ghost" onClick={onClose}>{t("cancel", lang)}</Button></div>
      </div>
    </Modal>
  );
}
function LoanPaymentModal({ loan, baskets, rate, onSave, onClose, lang }) {
  const suggested = loanMonthlyPayment(loan.principal, loan.apy, loan.months);
  const [amountMeta, setAmountMeta] = useState({ usd: loan.nativeCurrency === "IRT" ? suggested / (rate || 1) : suggested, entered: suggested, currency: loan.nativeCurrency || "USD" });
  const [basketId, setBasketId] = useState("");
  const [note, setNote] = useState("");
  const basket = baskets.find(b => b.id === basketId);
  const requiredMagnitude = basket ? amountInCurrency(amountMeta, basket.nativeCurrency || "USD", rate) : 0;
  const insufficientFunds = basket && requiredMagnitude > (Number(basket.balance) || 0) + 1e-9;
  return (
    <Modal title={`${t("logPayment", lang)} · ${loan.name}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <AmountField label={t("amount", lang)} initialEntered={suggested} initialCurrency={loan.nativeCurrency || "USD"} onChange={setAmountMeta} rate={rate} lang={lang} />
        <Field label={t("payFrom", lang)}>
          <TSelect value={basketId} onChange={e => setBasketId(e.target.value)}>
            <option value="">{t("noAccount", lang)}</option>
            {baskets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </TSelect>
        </Field>
        {insufficientFunds && <div className="text-xs" style={{ color: PALETTE.coral }}>{t("insufficientFunds", lang)}</div>}
        <Field label={t("note", lang)}><TInput value={note} onChange={e => setNote(e.target.value)} /></Field>
        <div className="flex gap-2 mt-2"><Button onClick={() => onSave({ amountMeta, basketId: basketId || null, note })} disabled={!amountMeta.entered || insufficientFunds}>{t("save", lang)}</Button><Button variant="ghost" onClick={onClose}>{t("cancel", lang)}</Button></div>
      </div>
    </Modal>
  );
}
function DebtModal({ initial, rate, onSave, onClose, lang }) {
  const [form, setForm] = useState(initial ? { ...initial } : { name: "", type: "owed_to_me", amount: 0, nativeCurrency: "USD", note: "" });
  return (
    <Modal title={initial ? t("edit", lang) : t("addDebt", lang)} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Field label={t("name", lang)}><TInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={lang === "fa" ? "نام شخص" : "Person's name"} /></Field>
        <Field label={t("debtType", lang)}>
          <div className="flex gap-2">
            {["owed_to_me", "i_owe"].map(ty => (
              <button key={ty} type="button" onClick={() => setForm({ ...form, type: ty })} className="flex-1 py-2 rounded-lg text-sm"
                style={{ background: form.type === ty ? PALETTE.teal : PALETTE.bgSoft, color: form.type === ty ? "#06120E" : PALETTE.ink }}>
                {ty === "owed_to_me" ? t("owedToMe", lang) : t("iOwe", lang)}
              </button>
            ))}
          </div>
        </Field>
        <AmountField label={t("totalAmount", lang)} initialEntered={initial?.amount} initialCurrency={initial?.nativeCurrency || "USD"} onChange={v => setForm({ ...form, amount: v.entered, nativeCurrency: v.currency })} rate={rate} lang={lang} />
        <Field label={t("note", lang)}><TInput value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })} /></Field>
        <div className="flex gap-2 mt-2"><Button onClick={() => onSave(form)} disabled={!form.name || !form.amount}>{t("save", lang)}</Button><Button variant="ghost" onClick={onClose}>{t("cancel", lang)}</Button></div>
      </div>
    </Modal>
  );
}
function DebtPaymentModal({ debt, baskets, rate, onSave, onClose, lang }) {
  const [amountMeta, setAmountMeta] = useState({ usd: 0, entered: 0, currency: debt.nativeCurrency || "USD" });
  const [basketId, setBasketId] = useState("");
  const [note, setNote] = useState("");
  const accountLabel = debt.type === "owed_to_me" ? t("payFromReceived", lang) : t("payFrom", lang);
  const basket = baskets.find(b => b.id === basketId);
  // Only paying someone off (i_owe) draws money OUT of an account — receiving
  // a repayment (owed_to_me) adds to it, so there's nothing to check there.
  const requiredMagnitude = basket && debt.type === "i_owe" ? amountInCurrency(amountMeta, basket.nativeCurrency || "USD", rate) : 0;
  const insufficientFunds = basket && debt.type === "i_owe" && requiredMagnitude > (Number(basket.balance) || 0) + 1e-9;
  return (
    <Modal title={`${t("logPayment", lang)} · ${debt.name}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <AmountField label={t("amount", lang)} initialCurrency={debt.nativeCurrency || "USD"} onChange={setAmountMeta} rate={rate} lang={lang} />
        <Field label={accountLabel}>
          <TSelect value={basketId} onChange={e => setBasketId(e.target.value)}>
            <option value="">{t("noAccount", lang)}</option>
            {baskets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </TSelect>
        </Field>
        {insufficientFunds && <div className="text-xs" style={{ color: PALETTE.coral }}>{t("insufficientFunds", lang)}</div>}
        <Field label={t("note", lang)}><TInput value={note} onChange={e => setNote(e.target.value)} /></Field>
        <div className="flex gap-2 mt-2"><Button onClick={() => onSave({ amountMeta, basketId: basketId || null, note })} disabled={!amountMeta.entered || insufficientFunds}>{t("save", lang)}</Button><Button variant="ghost" onClick={onClose}>{t("cancel", lang)}</Button></div>
      </div>
    </Modal>
  );
}
function GoalModal({ initial, rate, onSave, onClose, lang }) {
  const [form, setForm] = useState(initial ? { ...initial } : { name: "", targetAmount: 0, currentAmount: 0, nativeCurrency: "USD" });
  const [targetMeta, setTargetMeta] = useState({ usd: 0, entered: initial?.targetAmount || 0, currency: initial?.nativeCurrency || "USD" });
  const [currentMeta, setCurrentMeta] = useState({ usd: 0, entered: initial?.currentAmount || 0, currency: initial?.nativeCurrency || "USD" });
  const save = () => {
    const nativeCurrency = targetMeta.currency;
    const currentInTarget = amountInCurrency(currentMeta, nativeCurrency, rate);
    onSave({ ...form, targetAmount: targetMeta.entered, currentAmount: currentInTarget, nativeCurrency });
  };
  return (
    <Modal title={initial ? t("edit", lang) : t("addGoal", lang)} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Field label={t("name", lang)}><TInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
        <AmountField label={t("targetAmount", lang)} initialEntered={initial?.targetAmount} initialCurrency={initial?.nativeCurrency || "USD"} onChange={setTargetMeta} rate={rate} lang={lang} />
        <AmountField label={t("currentAmount", lang)} initialEntered={initial?.currentAmount} initialCurrency={initial?.nativeCurrency || "USD"} onChange={setCurrentMeta} rate={rate} lang={lang} />
        <p className="text-[11px]" style={{ color: PALETTE.inkDim }}>{t("nativeCurrencyNote", lang)}</p>
        <div className="flex gap-2 mt-2"><Button onClick={save} disabled={!form.name}>{t("save", lang)}</Button><Button variant="ghost" onClick={onClose}>{t("cancel", lang)}</Button></div>
      </div>
    </Modal>
  );
}
function GoalTxModal({ goal, type, rate, onSave, onClose, lang }) {
  const [amountMeta, setAmountMeta] = useState({ usd: 0, entered: 0, currency: goal.nativeCurrency || "USD" });
  return (
    <Modal title={`${t(type, lang)} · ${goal.name}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <AmountField label={t("amount", lang)} initialCurrency={goal.nativeCurrency || "USD"} onChange={setAmountMeta} rate={rate} lang={lang} />
        <div className="flex gap-2 mt-2"><Button onClick={() => onSave(amountMeta)} disabled={!amountMeta.entered}>{t("save", lang)}</Button><Button variant="ghost" onClick={onClose}>{t("cancel", lang)}</Button></div>
      </div>
    </Modal>
  );
}
function TxModal({ data, initialTargetId, initialTargetType, initialType, editing, rate, onSave, onClose, lang }) {
  const targets = useMemo(() => allTargets(data), [data]);
  const [targetKey, setTargetKey] = useState(() => {
    const first = targets.find(x => x.id === initialTargetId) || targets[0];
    return first ? `${first.type}:${first.id}` : "";
  });
  const [type, setType] = useState(initialType || "deposit");
  const [amountMeta, setAmountMeta] = useState(() => editing
    ? { usd: Math.abs(editing.amount), entered: Math.abs(editing.displayAmount ?? editing.amount), currency: editing.displayCurrency || "USD" }
    : { usd: 0, entered: 0, currency: "USD" });
  const [note, setNote] = useState(editing?.note || "");
  const [txCategory, setTxCategory] = useState(editing?.txCategory || null);
  const [dateStr, setDateStr] = useState(() => {
    const d = editing ? new Date(editing.date) : new Date();
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [targetType, targetId] = targetKey ? targetKey.split(":") : [null, null];
  const target = targets.find(x => x.id === targetId);

  const toOptions = targets.filter(x => `${x.type}:${x.id}` !== targetKey);
  const [toTargetKey, setToTargetKey] = useState(() => {
    if (editing?.secondaryTargetType && editing?.secondaryTargetId) return `${editing.secondaryTargetType}:${editing.secondaryTargetId}`;
    return toOptions[0] ? `${toOptions[0].type}:${toOptions[0].id}` : "";
  });
  const [toTargetType, toTargetId] = toTargetKey ? toTargetKey.split(":") : [null, null];

  const isTransfer = type === "transfer";
  const needsFundsCheck = type === "withdraw" || isTransfer;

  // If editing this exact activity, its own past effect is still baked into
  // target.balance — add it back first so we're checking against what will
  // actually be available once the old effect is reverted and reapplied.
  const alreadyAppliedHere = editing && editing.targetId === targetId && editing.targetType === targetType ? (editing.targetDelta || 0) : 0;
  const availableBalance = target ? (Number(target.balance) || 0) - alreadyAppliedHere : 0;
  const requiredMagnitude = target && needsFundsCheck ? amountInCurrency(amountMeta, target.nativeCurrency || "USD", rate) : 0;
  const insufficientFunds = needsFundsCheck && target && requiredMagnitude > availableBalance + 1e-9;

  return (
    <Modal title={editing ? t("editActivity", lang) : t("addTx", lang)} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Field label={isTransfer ? t("transferFrom", lang) : t("selectBasket", lang)}>
          <TSelect value={targetKey} onChange={e => setTargetKey(e.target.value)}>{targets.map(x => <option key={`${x.type}:${x.id}`} value={`${x.type}:${x.id}`}>{x.name}</option>)}</TSelect>
        </Field>
        <Field label={t("category", lang)}>
          <div className="flex gap-2 flex-wrap">
            {["deposit", "withdraw", "transfer", "interest"].map(ty => (
              <button key={ty} onClick={() => setType(ty)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: type === ty ? PALETTE.teal : PALETTE.bgSoft, color: type === ty ? "#06120E" : PALETTE.ink }}>{t(ty, lang)}</button>
            ))}
          </div>
        </Field>
        {isTransfer && (
          <Field label={t("transferTo", lang)}>
            {toOptions.length === 0 ? (
              <div className="text-xs" style={{ color: PALETTE.coral }}>{t("transferNeedsTwo", lang)}</div>
            ) : (
              <TSelect value={toTargetKey} onChange={e => setToTargetKey(e.target.value)}>{toOptions.map(x => <option key={`${x.type}:${x.id}`} value={`${x.type}:${x.id}`}>{x.name}</option>)}</TSelect>
            )}
          </Field>
        )}
        <AmountField label={t("amount", lang)} initialEntered={editing ? Math.abs(editing.displayAmount ?? editing.amount) : undefined} initialCurrency={editing?.displayCurrency || "USD"} onChange={setAmountMeta} rate={rate} lang={lang} />
        {insufficientFunds && <div className="text-xs" style={{ color: PALETTE.coral }}>{t("insufficientFunds", lang)}</div>}
        {type === "withdraw" && <CategoryPicker value={txCategory} onChange={setTxCategory} lang={lang} categories={TX_CATEGORIES} label={t("spendingCategory", lang)} />}
        {type === "deposit" && <CategoryPicker value={txCategory} onChange={setTxCategory} lang={lang} categories={DEPOSIT_CATEGORIES} label={t("incomeCategory", lang)} />}
        <Field label={t("date", lang)}><TInput type="datetime-local" value={dateStr} onChange={e => setDateStr(e.target.value)} /></Field>
        <Field label={t("note", lang)}><TInput value={note} onChange={e => setNote(e.target.value)} /></Field>
        {target && <div className="text-[11px]" style={{ color: PALETTE.inkDim }}>{t("balance", lang)}: {fmtExact(target.balance, target.nativeCurrency)}</div>}
        <div className="flex gap-2 mt-2">
          <Button onClick={() => onSave({
            id: editing?.id, targetId, targetType, type, amountMeta, note,
            txCategory: (type === "withdraw" || type === "deposit") ? txCategory : null,
            toTargetId: isTransfer ? toTargetId : null, toTargetType: isTransfer ? toTargetType : null,
            date: dateStr ? new Date(dateStr).toISOString() : nowISO(),
          })} disabled={!targetId || !amountMeta.entered || (isTransfer && !toTargetId) || insufficientFunds}>{t("save", lang)}</Button>
          <Button variant="ghost" onClick={onClose}>{t("cancel", lang)}</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================================
   ROOT APP
   ============================================================================ */
export default function WealthDashboard() {
  const [data, setData, loaded] = useWealthStore();
  const [view, setView] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [liveRate, setLiveRate] = useState({ loading: true, error: null, updatedAt: null });
  const lang = data.settings.lang;
  const currency = data.settings.currency;
  const rate = data.settings.usdtToIrt;
  const isFa = lang === "fa";
  const setLang = (l) => setData(d => ({ ...d, settings: { ...d.settings, lang: typeof l === "function" ? l(d.settings.lang) : l } }));
  const setCurrency = (c) => setData(d => ({ ...d, settings: { ...d.settings, currency: typeof c === "function" ? c(d.settings.currency) : c } }));

  const refreshLiveRate = () => {
    setLiveRate(r => ({ ...r, loading: true, error: null }));
    fetchUsdtRateLive()
      .then(irt => {
        setData(d => ({ ...d, settings: { ...d.settings, usdtToIrt: Math.round(irt) } }));
        setLiveRate({ loading: false, error: null, updatedAt: nowISO() });
      })
      .catch(e => {
        console.error("USDT rate fetch failed — keeping last known/manual rate.", e);
        setLiveRate({ loading: false, error: String(e.message || e), updatedAt: null });
      });
  };
  useEffect(() => { refreshLiveRate(); }, []);

  /* ---------------- basket CRUD ---------------- */
  const saveBasket = (form) => {
    setData(d => {
      const exists = d.baskets.some(b => b.id === form.id);
      if (exists) return { ...d, baskets: d.baskets.map(b => b.id === form.id ? { ...b, ...form, balance: Number(form.balance) } : b) };
      const basket = { ...form, id: uid(), createdAt: nowISO(), initialBalance: Number(form.balance) || 0, balance: Number(form.balance) || 0 };
      return { ...d, baskets: [...d.baskets, basket] };
    });
    setModal(null);
  };
  const deleteBasket = (id) => setData(d => ({
    ...d, baskets: d.baskets.filter(b => b.id !== id),
    defiPositions: d.defiPositions.filter(p => p.walletId !== id),
    activities: d.activities.filter(a => a.targetId !== id),
  }));

  /* ---------------- DeFi CRUD ---------------- */
  const saveDefi = (form) => {
    setData(d => {
      const exists = d.defiPositions.some(p => p.id === form.id);
      if (exists) return { ...d, defiPositions: d.defiPositions.map(p => p.id === form.id ? { ...p, ...form, balance: Number(form.balance) } : p) };
      const pos = { ...form, id: uid(), createdAt: nowISO(), initialBalance: Number(form.balance) || 0, balance: Number(form.balance) || 0 };
      return { ...d, defiPositions: [...d.defiPositions, pos] };
    });
    setModal(null);
  };
  const deleteDefi = (id) => setData(d => ({ ...d, defiPositions: d.defiPositions.filter(p => p.id !== id), activities: d.activities.filter(a => a.targetId !== id) }));

  /* ---------------- Loan CRUD ---------------- */
  const saveLoan = (form) => {
    setData(d => {
      const exists = d.loans.some(l => l.id === form.id);
      if (exists) return { ...d, loans: d.loans.map(l => l.id === form.id ? { ...l, ...form } : l) };
      const loan = { ...form, id: uid(), createdAt: nowISO(), amountPaid: 0, payments: [] };
      return { ...d, loans: [...d.loans, loan] };
    });
    setModal(null);
  };
  const deleteLoan = (id) => setData(d => ({ ...d, loans: d.loans.filter(l => l.id !== id), activities: d.activities.filter(a => a.targetId !== id) }));
  const logLoanPayment = (loan, { amountMeta, basketId, note }) => {
    setData(d => {
      const loanDelta = amountInCurrency(amountMeta, loan.nativeCurrency || "USD", rate);
      let baskets = d.baskets;
      let secondaryTargetType = null, secondaryTargetId = null, secondaryDelta = null;
      if (basketId) {
        const basket = d.baskets.find(b => b.id === basketId);
        const basketDelta = -amountInCurrency(amountMeta, basket?.nativeCurrency || "USD", rate);
        baskets = d.baskets.map(b => b.id === basketId ? { ...b, balance: (Number(b.balance) || 0) + basketDelta } : b);
        secondaryTargetType = "basket"; secondaryTargetId = basketId; secondaryDelta = basketDelta;
      }
      const activityId = uid();
      const loans = d.loans.map(l => l.id === loan.id ? {
        ...l,
        amountPaid: (Number(l.amountPaid) || 0) + loanDelta,
        payments: [...(l.payments || []), { id: activityId, date: nowISO(), amount: loanDelta }],
      } : l);
      const activity = {
        id: activityId, date: nowISO(), type: "withdraw",
        targetType: "loan", targetId: loan.id, targetDelta: loanDelta,
        secondaryTargetType, secondaryTargetId, secondaryDelta,
        category: basketId ? (baskets.find(b => b.id === basketId)?.category || "loan") : "loan",
        amount: -Math.abs(amountMeta.usd),
        displayAmount: -Math.abs(amountMeta.entered), displayCurrency: amountMeta.currency,
        note: note || `${t("logPayment", lang)}: ${loan.name}`,
        txCategory: "loan", pctOfTotal: 0,
      };
      return { ...d, loans, baskets, activities: [...d.activities, activity] };
    });
    setModal(null);
  };

  /* ---------------- Goal CRUD ---------------- */
  const saveGoal = (form) => {
    setData(d => {
      const exists = d.goals.some(g => g.id === form.id);
      if (exists) return { ...d, goals: d.goals.map(g => g.id === form.id ? { ...g, ...form } : g) };
      const goal = { ...form, id: uid(), createdAt: nowISO() };
      return { ...d, goals: [...d.goals, goal] };
    });
    setModal(null);
  };
  const deleteGoal = (id) => setData(d => ({ ...d, goals: d.goals.filter(g => g.id !== id), activities: d.activities.filter(a => a.targetId !== id) }));
  const goalTx = (goal, type, amountMeta) => {
    setData(d => {
      const magnitude = amountInCurrency(amountMeta, goal.nativeCurrency || "USD", rate);
      const signedNative = type === "withdraw" ? -magnitude : magnitude;
      const goals = d.goals.map(g => g.id === goal.id ? { ...g, currentAmount: Math.max((Number(g.currentAmount) || 0) + signedNative, 0) } : g);
      const signedUsd = type === "withdraw" ? -Math.abs(amountMeta.usd) : Math.abs(amountMeta.usd);
      const signedDisplay = type === "withdraw" ? -Math.abs(amountMeta.entered) : Math.abs(amountMeta.entered);
      const activity = { id: uid(), date: nowISO(), type, targetType: "goal", targetId: goal.id, targetDelta: signedNative, category: "goal", amount: signedUsd, displayAmount: signedDisplay, displayCurrency: amountMeta.currency, note: goal.name, txCategory: null, pctOfTotal: 0 };
      return { ...d, goals, activities: [...d.activities, activity] };
    });
    setModal(null);
  };

  /* ---------------- Debt (Debtor & Creditor) CRUD ---------------- */
  const saveDebt = (form) => {
    setData(d => {
      const exists = d.debts.some(deb => deb.id === form.id);
      if (exists) return { ...d, debts: d.debts.map(deb => deb.id === form.id ? { ...deb, ...form, amount: Number(form.amount) } : deb) };
      const debt = { ...form, id: uid(), createdAt: nowISO(), paidAmount: 0, payments: [] };
      return { ...d, debts: [...d.debts, debt] };
    });
    setModal(null);
  };
  const deleteDebt = (id) => setData(d => ({ ...d, debts: d.debts.filter(deb => deb.id !== id), activities: d.activities.filter(a => a.targetId !== id) }));
  const logDebtPayment = (debt, { amountMeta, basketId, note }) => {
    setData(d => {
      const debtDelta = amountInCurrency(amountMeta, debt.nativeCurrency || "USD", rate);
      let baskets = d.baskets;
      let secondaryTargetType = null, secondaryTargetId = null, secondaryDelta = null;
      if (basketId) {
        const basket = d.baskets.find(b => b.id === basketId);
        // Someone paying me back adds to my account; me paying someone off subtracts from it.
        const sign = debt.type === "owed_to_me" ? 1 : -1;
        const basketDelta = sign * amountInCurrency(amountMeta, basket?.nativeCurrency || "USD", rate);
        baskets = d.baskets.map(b => b.id === basketId ? { ...b, balance: (Number(b.balance) || 0) + basketDelta } : b);
        secondaryTargetType = "basket"; secondaryTargetId = basketId; secondaryDelta = basketDelta;
      }
      const activityId = uid();
      const debts = d.debts.map(deb => deb.id === debt.id ? {
        ...deb,
        paidAmount: (Number(deb.paidAmount) || 0) + debtDelta,
        payments: [...(deb.payments || []), { id: activityId, date: nowISO(), amount: debtDelta }],
      } : deb);
      const activity = {
        id: activityId, date: nowISO(), type: debt.type === "owed_to_me" ? "deposit" : "withdraw",
        targetType: "debt", targetId: debt.id, targetDelta: debtDelta,
        secondaryTargetType, secondaryTargetId, secondaryDelta,
        category: basketId ? (baskets.find(b => b.id === basketId)?.category || "debt") : "debt",
        amount: debt.type === "owed_to_me" ? Math.abs(amountMeta.usd) : -Math.abs(amountMeta.usd),
        displayAmount: debt.type === "owed_to_me" ? Math.abs(amountMeta.entered) : -Math.abs(amountMeta.entered),
        displayCurrency: amountMeta.currency,
        note: note || `${t("logPayment", lang)}: ${debt.name}`,
        txCategory: null, pctOfTotal: 0,
      };
      return { ...d, debts, baskets, activities: [...d.activities, activity] };
    });
    setModal(null);
  };

  /* ---------------- transaction (ledger) — create + edit ---------------- */
  const applyTargetDelta = (d, targetType, targetId, delta) => {
    if (targetType === "basket") return { ...d, baskets: d.baskets.map(b => b.id === targetId ? { ...b, balance: (Number(b.balance) || 0) + delta } : b) };
    if (targetType === "defi") return { ...d, defiPositions: d.defiPositions.map(p => p.id === targetId ? { ...p, balance: (Number(p.balance) || 0) + delta } : p) };
    return d;
  };
  const saveTx = ({ id, targetId, targetType, type, amountMeta, note, txCategory, toTargetId, toTargetType, date }) => {
    setData(d => {
      let next = d;
      if (id) {
        const old = d.activities.find(a => a.id === id);
        if (old) {
          next = applyTargetDelta(next, old.targetType, old.targetId, -old.targetDelta);
          if (old.secondaryTargetType) next = applyTargetDelta(next, old.secondaryTargetType, old.secondaryTargetId, -old.secondaryDelta);
        }
      }
      const nativeCurrency = targetType === "defi"
        ? (next.defiPositions.find(p => p.id === targetId)?.nativeCurrency || "USD")
        : (next.baskets.find(b => b.id === targetId)?.nativeCurrency || "USD");
      const magnitude = amountInCurrency(amountMeta, nativeCurrency, rate);

      let signedNative, secondaryTargetType = null, secondaryTargetId = null, secondaryDelta = null, pctOfTotal;
      const signedUsd = (type === "withdraw" || type === "transfer") ? -Math.abs(amountMeta.usd) : Math.abs(amountMeta.usd);
      const signedDisplay = (type === "withdraw" || type === "transfer") ? -Math.abs(amountMeta.entered) : Math.abs(amountMeta.entered);

      if (type === "transfer" && toTargetId && toTargetType) {
        signedNative = -magnitude; // leaves the source account
        next = applyTargetDelta(next, targetType, targetId, signedNative);
        const destCurrency = toTargetType === "defi"
          ? (next.defiPositions.find(p => p.id === toTargetId)?.nativeCurrency || "USD")
          : (next.baskets.find(b => b.id === toTargetId)?.nativeCurrency || "USD");
        const destDelta = amountInCurrency(amountMeta, destCurrency, rate);
        next = applyTargetDelta(next, toTargetType, toTargetId, destDelta);
        secondaryTargetType = toTargetType; secondaryTargetId = toTargetId; secondaryDelta = destDelta;
        // A transfer moves money within your own tracked wealth — it doesn't
        // change your total net worth, so it isn't scored as a % impact.
        pctOfTotal = 0;
      } else {
        signedNative = type === "withdraw" ? -magnitude : magnitude;
        next = applyTargetDelta(next, targetType, targetId, signedNative);
        const prevTotal = totalNetWorth(next, rate);
        pctOfTotal = prevTotal !== 0 ? (signedUsd / Math.abs(prevTotal)) * 100 : (signedUsd !== 0 ? 100 : 0);
      }

      const category = targetType === "defi" ? "defi" : next.baskets.find(b => b.id === targetId)?.category;
      const activity = {
        id: id || uid(), date: date || nowISO(),
        type, targetId, targetType, targetDelta: signedNative,
        secondaryTargetType, secondaryTargetId, secondaryDelta,
        category, amount: signedUsd,
        displayAmount: signedDisplay, displayCurrency: amountMeta.currency,
        note, txCategory, pctOfTotal,
      };
      const activities = id ? next.activities.map(a => a.id === id ? activity : a) : [...next.activities, activity];
      return { ...next, activities };
    });
    setModal(null);
  };
  const deleteActivity = (id) => {
    setData(d => {
      const old = d.activities.find(a => a.id === id);
      if (!old) return d;
      let next = applyTargetDelta(d, old.targetType, old.targetId, -(old.targetDelta ?? old.amount));
      if (old.secondaryTargetType) next = applyTargetDelta(next, old.secondaryTargetType, old.secondaryTargetId, -old.secondaryDelta);
      if (old.targetType === "loan") next = { ...next, loans: next.loans.map(l => l.id === old.targetId ? { ...l, amountPaid: Math.max((Number(l.amountPaid) || 0) - (old.targetDelta ?? Math.abs(old.amount)), 0), payments: (l.payments || []).filter(p => p.id !== old.id) } : l) };
      if (old.targetType === "goal") next = { ...next, goals: next.goals.map(g => g.id === old.targetId ? { ...g, currentAmount: Math.max((Number(g.currentAmount) || 0) - (old.targetDelta ?? old.amount), 0) } : g) };
      if (old.targetType === "debt") next = { ...next, debts: next.debts.map(deb => deb.id === old.targetId ? { ...deb, paidAmount: Math.max((Number(deb.paidAmount) || 0) - (old.targetDelta ?? Math.abs(old.amount)), 0), payments: (deb.payments || []).filter(p => p.id !== old.id) } : deb) };
      return { ...next, activities: next.activities.filter(a => a.id !== id) };
    });
  };

  /* ---------------- backup export / import ---------------- */
  const exportBackup = () => {
    const payload = { app: "poolakoo", version: 2, exportedAt: nowISO(), data };
    downloadJSON(payload, `poolakoo-backup-${Date.now()}.json`);
  };
  const importBackup = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const incoming = parsed && parsed.data && typeof parsed.data === "object" ? parsed.data : parsed;
        if (!incoming || typeof incoming !== "object" || !Array.isArray(incoming.baskets)) { reject(new Error("Invalid backup file")); return; }
        setData({ ...DEFAULT_DATA, ...incoming, settings: { ...DEFAULT_DATA.settings, ...(incoming.settings || {}) } });
        resolve();
      } catch (e) { reject(e); }
    };
    reader.readAsText(file);
  });

  if (!loaded) return <div className="min-h-screen flex items-center justify-center" style={{ background: PALETTE.bg, color: PALETTE.inkDim }}>Loading…</div>;

  const wallets = data.baskets.filter(b => b.category === "hotWallet" || b.category === "coldWallet");

  return (
    <div dir={isFa ? "rtl" : "ltr"} className="min-h-screen w-full flex" style={{ background: PALETTE.bg, color: PALETTE.ink, fontFamily: isFa ? "'Vazirmatn', sans-serif" : "'Space Grotesk','Lotto',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Vazirmatn:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${PALETTE.panelBorder}; border-radius: 8px; }
      `}</style>
      <Sidebar view={view} setView={setView} lang={lang} />
      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        <Header lang={lang} setLang={setLang} currency={currency} setCurrency={setCurrency} view={view} rate={rate} liveRate={liveRate} onRefreshRate={refreshLiveRate} />
        <main className="flex-1 px-5 md:px-8 py-6">
          {view === "dashboard" && <DashboardView data={data} lang={lang} currency={currency} rate={rate} openTxModal={() => setModal({ kind: "tx" })} />}
          {view === "portfolio" && (
            <PortfolioView data={data} lang={lang} currency={currency} rate={rate}
              openBasketModal={(b, defCat) => setModal({ kind: "basket", payload: b, defaultCategory: defCat })}
              deleteBasket={deleteBasket}
              openTxModal={(basket, targetType, type) => setModal({ kind: "tx", payload: { targetId: basket.id, targetType, type } })}
              openDefiModal={(p) => setModal({ kind: "defi", payload: p })}
              deleteDefi={deleteDefi} />
          )}
          {view === "wallets" && (
            <WalletsView data={data} lang={lang} currency={currency} rate={rate}
              openBasketModal={(b, defCat) => setModal({ kind: "basket", payload: b, defaultCategory: defCat })}
              deleteBasket={deleteBasket}
              openTxModal={(basket, targetType, type) => setModal({ kind: "tx", payload: { targetId: basket.id, targetType, type } })} />
          )}
          {view === "defi" && (
            <DefiView data={data} lang={lang} currency={currency} rate={rate}
              openDefiModal={(p) => setModal({ kind: "defi", payload: p })} deleteDefi={deleteDefi}
              openTxModal={(pos, targetType, type) => setModal({ kind: "tx", payload: { targetId: pos.id, targetType, type } })} />
          )}
          {view === "trading" && <TradingView rate={rate} lang={lang} />}
          {view === "loans" && (
            <LoansView data={data} lang={lang} currency={currency} rate={rate}
              openLoanModal={(l) => setModal({ kind: "loan", payload: l })} deleteLoan={deleteLoan}
              openPayModal={(l) => setModal({ kind: "loanPay", payload: l })} />
          )}
          {view === "debts" && (
            <DebtsView data={data} lang={lang} currency={currency} rate={rate}
              openDebtModal={(deb) => setModal({ kind: "debt", payload: deb })} deleteDebt={deleteDebt}
              openPayModal={(deb) => setModal({ kind: "debtPay", payload: deb })} />
          )}
          {view === "goals" && (
            <GoalsView data={data} lang={lang} currency={currency} rate={rate}
              openGoalModal={(g) => setModal({ kind: "goal", payload: g })} deleteGoal={deleteGoal}
              openGoalTxModal={(g, type) => setModal({ kind: "goalTx", payload: g, txType: type })} />
          )}
          {view === "activity" && <ActivityView data={data} lang={lang} currency={currency} rate={rate}
            openEditActivity={(a) => setModal({ kind: "tx", payload: { targetId: a.targetId, targetType: a.targetType }, editing: a })}
            deleteActivity={deleteActivity} />}
          {view === "settings" && <SettingsView data={data} setData={setData} lang={lang} setLang={setLang} currency={currency} setCurrency={setCurrency} onExportBackup={exportBackup} onImportBackup={importBackup} />}
        </main>
      </div>
      <MobileNav view={view} setView={setView} lang={lang} />

      {modal?.kind === "basket" && <BasketModal initial={modal.payload} defaultCategory={modal.defaultCategory} rate={rate} lang={lang} onSave={saveBasket} onClose={() => setModal(null)} />}
      {modal?.kind === "defi" && <DefiModal initial={modal.payload} wallets={wallets} rate={rate} lang={lang} onSave={saveDefi} onClose={() => setModal(null)} />}
      {modal?.kind === "loan" && <LoanModal initial={modal.payload} rate={rate} lang={lang} onSave={saveLoan} onClose={() => setModal(null)} />}
      {modal?.kind === "loanPay" && <LoanPaymentModal loan={modal.payload} baskets={data.baskets} rate={rate} lang={lang} onSave={(payload) => logLoanPayment(modal.payload, payload)} onClose={() => setModal(null)} />}
      {modal?.kind === "debt" && <DebtModal initial={modal.payload} rate={rate} lang={lang} onSave={saveDebt} onClose={() => setModal(null)} />}
      {modal?.kind === "debtPay" && <DebtPaymentModal debt={modal.payload} baskets={data.baskets} rate={rate} lang={lang} onSave={(payload) => logDebtPayment(modal.payload, payload)} onClose={() => setModal(null)} />}
      {modal?.kind === "goal" && <GoalModal initial={modal.payload} rate={rate} lang={lang} onSave={saveGoal} onClose={() => setModal(null)} />}
      {modal?.kind === "goalTx" && <GoalTxModal goal={modal.payload} type={modal.txType} rate={rate} lang={lang} onSave={(meta) => goalTx(modal.payload, modal.txType, meta)} onClose={() => setModal(null)} />}
      {modal?.kind === "tx" && (
        <TxModal data={data} initialTargetId={modal.payload?.targetId} initialTargetType={modal.payload?.targetType} initialType={modal.payload?.type} editing={modal.editing}
          rate={rate} lang={lang} onSave={saveTx} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

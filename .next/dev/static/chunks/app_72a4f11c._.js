(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/app/components/common/Card.jsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Card
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
function Card({ children, className = '', onClick, hover = false }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `bg-white rounded-xl p-6 shadow-sm ${hover ? 'hover:shadow-md cursor-pointer' : ''} ${className}`,
        onClick: onClick,
        "data-testid": "card",
        children: children
    }, void 0, false, {
        fileName: "[project]/app/components/common/Card.jsx",
        lineNumber: 3,
        columnNumber: 5
    }, this);
}
_c = Card;
var _c;
__turbopack_context__.k.register(_c, "Card");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/components/common/Button.jsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Button
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
function Button({ children, variant = 'primary', onClick, type = 'button', disabled = false, className = '', icon }) {
    const baseClass = 'px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
        primary: 'bg-aa-orange text-white hover:bg-[#e56000] hover:shadow-lg',
        secondary: 'bg-white text-aa-dark-blue border-2 border-aa-dark-blue hover:bg-aa-dark-blue hover:text-white',
        outline: 'bg-transparent text-aa-orange border-2 border-aa-orange hover:bg-aa-orange hover:text-white',
        ghost: 'bg-transparent text-aa-gray hover:bg-gray-100'
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: type,
        onClick: onClick,
        disabled: disabled,
        className: `${baseClass} ${variants[variant]} ${className}`,
        "data-testid": "button",
        children: [
            icon && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: icon
            }, void 0, false, {
                fileName: "[project]/app/components/common/Button.jsx",
                lineNumber: 27,
                columnNumber: 16
            }, this),
            children
        ]
    }, void 0, true, {
        fileName: "[project]/app/components/common/Button.jsx",
        lineNumber: 20,
        columnNumber: 5
    }, this);
}
_c = Button;
var _c;
__turbopack_context__.k.register(_c, "Button");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/components/common/Input.jsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Input
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
function Input({ label, type = 'text', value, onChange, placeholder, required = false, className = '', error, icon, rightElement, ...props }) {
    const hasLeftIcon = Boolean(icon);
    const hasRightElement = Boolean(rightElement);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `w-full ${className}`,
        children: [
            label && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "block text-sm font-semibold text-aa-text-dark mb-2",
                children: [
                    label,
                    " ",
                    required && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-red-500",
                        children: "*"
                    }, void 0, false, {
                        fileName: "[project]/app/components/common/Input.jsx",
                        lineNumber: 20,
                        columnNumber: 32
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/components/common/Input.jsx",
                lineNumber: 19,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative",
                children: [
                    hasLeftIcon && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400",
                        children: icon
                    }, void 0, false, {
                        fileName: "[project]/app/components/common/Input.jsx",
                        lineNumber: 25,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: type,
                        value: value,
                        onChange: onChange,
                        placeholder: placeholder,
                        className: `w-full px-4 py-3 border-2 rounded-lg outline-none focus:border-aa-orange ${error ? 'border-red-500' : 'border-gray-200'} ${hasLeftIcon ? 'pl-10' : ''} ${hasRightElement ? 'pr-12' : ''}`,
                        "data-testid": "input-field",
                        ...props
                    }, void 0, false, {
                        fileName: "[project]/app/components/common/Input.jsx",
                        lineNumber: 29,
                        columnNumber: 9
                    }, this),
                    hasRightElement && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "absolute right-3 top-1/2 -translate-y-1/2",
                        children: rightElement
                    }, void 0, false, {
                        fileName: "[project]/app/components/common/Input.jsx",
                        lineNumber: 41,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/components/common/Input.jsx",
                lineNumber: 23,
                columnNumber: 7
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-red-500 text-xs mt-1",
                children: error
            }, void 0, false, {
                fileName: "[project]/app/components/common/Input.jsx",
                lineNumber: 46,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/components/common/Input.jsx",
        lineNumber: 17,
        columnNumber: 5
    }, this);
}
_c = Input;
var _c;
__turbopack_context__.k.register(_c, "Input");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/components/common/Badge.jsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Badge
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
;
function Badge({ children, variant = 'default', className = '' }) {
    const variants = {
        default: 'bg-gray-100 text-gray-700',
        orange: 'bg-orange-100 text-aa-orange',
        blue: 'bg-blue-100 text-aa-dark-blue',
        green: 'bg-green-100 text-green-700',
        red: 'bg-red-100 text-red-700',
        yellow: 'bg-yellow-100 text-yellow-700'
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `inline-block px-3 py-1 text-xs font-semibold rounded-full ${variants[variant]} ${className}`,
        "data-testid": "badge",
        children: children
    }, void 0, false, {
        fileName: "[project]/app/components/common/Badge.jsx",
        lineNumber: 12,
        columnNumber: 5
    }, this);
}
_c = Badge;
var _c;
__turbopack_context__.k.register(_c, "Badge");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/settings/page.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SettingsPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/socket.io-client/build/esm/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Card$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/components/common/Card.jsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Button$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/components/common/Button.jsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Input$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/components/common/Input.jsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Badge$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/components/common/Badge.jsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$auth$2f$AuthProvider$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/components/auth/AuthProvider.jsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$fortawesome$2f$react$2d$fontawesome$2f$index$2e$es$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@fortawesome/react-fontawesome/index.es.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$fortawesome$2f$free$2d$solid$2d$svg$2d$icons$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@fortawesome/free-solid-svg-icons/index.mjs [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
;
;
const WHATSAPP_API_BASE = ("TURBOPACK compile-time value", "http://localhost:4000") || 'http://localhost:3001';
const WHATSAPP_SOCKET_URL = ("TURBOPACK compile-time value", "http://localhost:4000") || WHATSAPP_API_BASE;
function SettingsPage() {
    _s();
    const { user, loading: authLoading, refresh } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$auth$2f$AuthProvider$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('profile');
    const [profile, setProfile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        name: '',
        email: '',
        phone: ''
    });
    const [profilePhoto, setProfilePhoto] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [profilePhotoPreview, setProfilePhotoPreview] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [saveStatus, setSaveStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [whatsappConnected, setWhatsappConnected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [whatsappStatus, setWhatsappStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('idle');
    const [whatsappQr, setWhatsappQr] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [whatsappActionStatus, setWhatsappActionStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [profileLoading, setProfileLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [profileError, setProfileError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [passwordForm, setPasswordForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        current: '',
        next: '',
        confirm: ''
    });
    const [passwordStatus, setPasswordStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [passwordLoading, setPasswordLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [whatsappConfig, setWhatsappConfig] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        phone: '',
        businessName: '',
        category: 'Technology'
    });
    const updatePasswordField = (field)=>(event)=>setPasswordForm((prev)=>({
                    ...prev,
                    [field]: event.target.value
                }));
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SettingsPage.useEffect": ()=>{
            if (user) {
                setProfile({
                    "SettingsPage.useEffect": (prev)=>({
                            name: user.name || prev.name,
                            email: user.email || prev.email,
                            phone: user.phone || prev.phone
                        })
                }["SettingsPage.useEffect"]);
            }
        }
    }["SettingsPage.useEffect"], [
        user
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SettingsPage.useEffect": ()=>{
            const loadProfile = {
                "SettingsPage.useEffect.loadProfile": async ()=>{
                    try {
                        setProfileError('');
                        const response = await fetch('/api/profile', {
                            credentials: 'include'
                        });
                        const contentType = response.headers.get('content-type') || '';
                        if (!contentType.includes('application/json')) {
                            const text = await response.text();
                            throw new Error(text || 'Unexpected server response');
                        }
                        const data = await response.json();
                        if (!response.ok) {
                            throw new Error(data.error || 'Failed to load profile');
                        }
                        setProfile({
                            name: data.data?.name || '',
                            email: data.data?.email || '',
                            phone: data.data?.phone || ''
                        });
                        if (data.data?.whatsapp_number || data.data?.whatsapp_name) {
                            setWhatsappConfig({
                                "SettingsPage.useEffect.loadProfile": (prev)=>({
                                        ...prev,
                                        phone: data.data?.whatsapp_number || prev.phone,
                                        businessName: data.data?.whatsapp_name || prev.businessName
                                    })
                            }["SettingsPage.useEffect.loadProfile"]);
                        }
                    } catch (error) {
                        console.error('Failed to load profile:', error);
                        setProfileError(error.message);
                    } finally{
                        setProfileLoading(false);
                    }
                }
            }["SettingsPage.useEffect.loadProfile"];
            if (authLoading) return;
            if (!user) {
                setProfileLoading(false);
                return;
            }
            loadProfile();
        }
    }["SettingsPage.useEffect"], [
        authLoading,
        user
    ]);
    const fetchWhatsAppStatus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SettingsPage.useCallback[fetchWhatsAppStatus]": async (isMountedRef = {
            current: true
        })=>{
            try {
                if (!user?.id) return;
                const response = await fetch(`${WHATSAPP_API_BASE}/whatsapp/status?adminId=${user.id}`);
                if (!response.ok) {
                    throw new Error('Failed to load WhatsApp status');
                }
                const payload = await response.json();
                if (!isMountedRef.current) return;
                const nextStatus = payload?.status || 'idle';
                const isCurrentAdmin = payload?.activeAdminId && user?.id && payload.activeAdminId === user.id;
                const derivedStatus = nextStatus === 'connected' && !isCurrentAdmin ? 'connected_other' : nextStatus;
                setWhatsappStatus(derivedStatus);
                setWhatsappConnected(derivedStatus === 'connected');
                if (derivedStatus === 'connected') {
                    setWhatsappQr('');
                } else if (payload?.qrImage) {
                    setWhatsappQr(payload.qrImage);
                }
            } catch (error) {
                if (isMountedRef.current) {
                    setWhatsappActionStatus('Unable to fetch WhatsApp status.');
                }
            }
        }
    }["SettingsPage.useCallback[fetchWhatsAppStatus]"], [
        user?.id
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SettingsPage.useEffect": ()=>{
            const isMountedRef = {
                current: true
            };
            if (!user?.id) {
                return ({
                    "SettingsPage.useEffect": ()=>{
                        isMountedRef.current = false;
                    }
                })["SettingsPage.useEffect"];
            }
            fetchWhatsAppStatus(isMountedRef);
            const socket = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["io"])(WHATSAPP_SOCKET_URL, {
                query: {
                    adminId: user?.id
                }
            });
            socket.on('whatsapp:status', {
                "SettingsPage.useEffect": (payload)=>{
                    const nextStatus = payload?.status || 'idle';
                    const isCurrentAdmin = payload?.activeAdminId && user?.id && payload.activeAdminId === user.id;
                    const derivedStatus = nextStatus === 'connected' && !isCurrentAdmin ? 'connected_other' : nextStatus;
                    setWhatsappStatus(derivedStatus);
                    setWhatsappConnected(derivedStatus === 'connected');
                    if (derivedStatus === 'connected') {
                        setWhatsappQr('');
                    } else if (payload?.qrImage) {
                        setWhatsappQr(payload.qrImage);
                    }
                }
            }["SettingsPage.useEffect"]);
            socket.on('whatsapp:qr', {
                "SettingsPage.useEffect": (qrImage)=>{
                    if (qrImage) {
                        setWhatsappQr(qrImage);
                    }
                }
            }["SettingsPage.useEffect"]);
            socket.on('connect_error', {
                "SettingsPage.useEffect": ()=>{
                    setWhatsappActionStatus('Unable to connect to WhatsApp service.');
                }
            }["SettingsPage.useEffect"]);
            return ({
                "SettingsPage.useEffect": ()=>{
                    isMountedRef.current = false;
                    socket.disconnect();
                }
            })["SettingsPage.useEffect"];
        }
    }["SettingsPage.useEffect"], [
        fetchWhatsAppStatus,
        user?.id
    ]);
    const handleStartWhatsApp = async ()=>{
        try {
            setWhatsappActionStatus('');
            const response = await fetch(`${WHATSAPP_API_BASE}/whatsapp/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    adminId: user?.id
                })
            });
            if (!response.ok) {
                throw new Error('Failed to start WhatsApp');
            }
            await fetchWhatsAppStatus();
        } catch (error) {
            setWhatsappActionStatus(error.message);
        }
    };
    const handleDisconnectWhatsApp = async ()=>{
        try {
            setWhatsappActionStatus('');
            const response = await fetch(`${WHATSAPP_API_BASE}/whatsapp/disconnect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    adminId: user?.id
                })
            });
            if (!response.ok) {
                throw new Error('Failed to disconnect WhatsApp');
            }
            await fetchWhatsAppStatus();
        } catch (error) {
            setWhatsappActionStatus(error.message);
        }
    };
    const tabs = [
        {
            id: 'profile',
            name: 'Profile',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$fortawesome$2f$free$2d$solid$2d$svg$2d$icons$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["faUser"]
        },
        // { id: 'notifications', name: 'Notifications', icon: faBell },
        {
            id: 'appearance',
            name: 'Appearance',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$fortawesome$2f$free$2d$solid$2d$svg$2d$icons$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["faPalette"]
        },
        {
            id: 'whatsapp',
            name: 'WhatsApp',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$fortawesome$2f$free$2d$solid$2d$svg$2d$icons$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["faMobileScreen"]
        },
        // { id: 'integrations', name: 'Integrations', icon: faGlobe },
        {
            id: 'security',
            name: 'Security',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$fortawesome$2f$free$2d$solid$2d$svg$2d$icons$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["faShieldHalved"]
        }
    ];
    const isWhatsappPending = whatsappStatus === 'starting' || whatsappStatus === 'qr';
    const canDisconnect = whatsappConnected || whatsappStatus === 'connected_other';
    const whatsappTone = whatsappConnected ? 'green' : isWhatsappPending ? 'amber' : 'red';
    const whatsappStatusLabel = whatsappConnected ? 'Configured' : whatsappStatus === 'connected_other' ? 'Connected (Other Admin)' : whatsappStatus === 'starting' ? 'Starting' : whatsappStatus === 'qr' ? 'Awaiting Scan' : whatsappStatus === 'auth_failure' ? 'Auth Failed' : 'Disconnected';
    const whatsappStatusMessage = whatsappConnected ? 'WhatsApp is connected and configured for this admin.' : whatsappStatus === 'connected_other' ? 'WhatsApp is connected under a different admin account.' : whatsappStatus === 'starting' ? 'Starting WhatsApp client. Please wait...' : whatsappStatus === 'qr' ? 'Scan the QR code below with WhatsApp to connect.' : whatsappStatus === 'auth_failure' ? 'Authentication failed. Please reconnect.' : 'WhatsApp client is currently disconnected.';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-6",
        "data-testid": "settings-page",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-3xl font-bold text-aa-dark-blue mb-2",
                        children: "Settings"
                    }, void 0, false, {
                        fileName: "[project]/app/settings/page.js",
                        lineNumber: 259,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-aa-gray",
                        children: "Manage your account and application preferences"
                    }, void 0, false, {
                        fileName: "[project]/app/settings/page.js",
                        lineNumber: 260,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/settings/page.js",
                lineNumber: 258,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-12 gap-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "col-span-3",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Card$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            className: "p-2",
                            children: tabs.map((tab)=>{
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setActiveTab(tab.id),
                                    className: `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left mb-1 ${activeTab === tab.id ? 'bg-aa-orange text-white' : 'text-aa-gray hover:bg-gray-50'}`,
                                    "data-testid": `settings-tab-${tab.id}`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$fortawesome$2f$react$2d$fontawesome$2f$index$2e$es$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FontAwesomeIcon"], {
                                            icon: tab.icon,
                                            style: {
                                                fontSize: 18
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/app/settings/page.js",
                                            lineNumber: 279,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "font-semibold",
                                            children: tab.name
                                        }, void 0, false, {
                                            fileName: "[project]/app/settings/page.js",
                                            lineNumber: 280,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, tab.id, true, {
                                    fileName: "[project]/app/settings/page.js",
                                    lineNumber: 269,
                                    columnNumber: 17
                                }, this);
                            })
                        }, void 0, false, {
                            fileName: "[project]/app/settings/page.js",
                            lineNumber: 266,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/settings/page.js",
                        lineNumber: 265,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "col-span-9",
                        children: [
                            activeTab === 'profile' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Card$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-2xl font-bold text-aa-dark-blue mb-6",
                                        children: "Profile Settings"
                                    }, void 0, false, {
                                        fileName: "[project]/app/settings/page.js",
                                        lineNumber: 292,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-6 pb-6 border-b border-gray-200",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "w-24 h-24 rounded-full bg-aa-dark-blue flex items-center justify-center overflow-hidden",
                                                        children: profilePhotoPreview ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                            src: profilePhotoPreview,
                                                            alt: "Profile",
                                                            className: "w-full h-full object-cover"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/settings/page.js",
                                                            lineNumber: 297,
                                                            columnNumber: 23
                                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-white font-bold text-3xl",
                                                            children: profile.name?.charAt(0) || 'A'
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/settings/page.js",
                                                            lineNumber: 303,
                                                            columnNumber: 23
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 295,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                id: "profile-photo-input",
                                                                type: "file",
                                                                accept: "image/*",
                                                                className: "hidden",
                                                                onChange: (event)=>{
                                                                    const file = event.target.files?.[0];
                                                                    if (!file) return;
                                                                    setProfilePhoto(file);
                                                                    setProfilePhotoPreview(URL.createObjectURL(file));
                                                                }
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/settings/page.js",
                                                                lineNumber: 309,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex items-center gap-3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Button$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                        variant: "outline",
                                                                        onClick: ()=>document.getElementById('profile-photo-input')?.click(),
                                                                        children: "Change Photo"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/settings/page.js",
                                                                        lineNumber: 322,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    profilePhotoPreview && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Button$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                        variant: "ghost",
                                                                        onClick: ()=>{
                                                                            setProfilePhoto(null);
                                                                            setProfilePhotoPreview(null);
                                                                        },
                                                                        children: "Remove"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/settings/page.js",
                                                                        lineNumber: 329,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/settings/page.js",
                                                                lineNumber: 321,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-xs text-aa-gray mt-2",
                                                                children: "JPG, PNG. Max size 2MB"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/settings/page.js",
                                                                lineNumber: 340,
                                                                columnNumber: 21
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 308,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/settings/page.js",
                                                lineNumber: 294,
                                                columnNumber: 17
                                            }, this),
                                            profileError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm",
                                                children: profileError
                                            }, void 0, false, {
                                                fileName: "[project]/app/settings/page.js",
                                                lineNumber: 345,
                                                columnNumber: 19
                                            }, this),
                                            profileLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "p-4 bg-gray-50 rounded-lg text-aa-gray text-sm",
                                                children: "Loading profile data..."
                                            }, void 0, false, {
                                                fileName: "[project]/app/settings/page.js",
                                                lineNumber: 351,
                                                columnNumber: 19
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "grid grid-cols-2 gap-4",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Input$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                        label: "Full Name",
                                                        value: profile.name,
                                                        onChange: (event)=>setProfile((prev)=>({
                                                                    ...prev,
                                                                    name: event.target.value
                                                                })),
                                                        placeholder: "Enter your name"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 356,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Input$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                        label: "Email",
                                                        type: "email",
                                                        value: profile.email,
                                                        onChange: (event)=>setProfile((prev)=>({
                                                                    ...prev,
                                                                    email: event.target.value
                                                                })),
                                                        placeholder: "Enter your email"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 362,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/settings/page.js",
                                                lineNumber: 355,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "grid grid-cols-2 gap-4",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Input$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                    label: "Phone",
                                                    value: profile.phone,
                                                    onChange: (event)=>setProfile((prev)=>({
                                                                ...prev,
                                                                phone: event.target.value
                                                            })),
                                                    placeholder: "Enter phone number",
                                                    disabled: true
                                                }, void 0, false, {
                                                    fileName: "[project]/app/settings/page.js",
                                                    lineNumber: 373,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/settings/page.js",
                                                lineNumber: 372,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex flex-wrap items-center gap-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Button$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                        variant: "primary",
                                                        onClick: async ()=>{
                                                            try {
                                                                setSaveStatus('');
                                                                const response = await fetch('/api/profile', {
                                                                    method: 'PUT',
                                                                    headers: {
                                                                        'Content-Type': 'application/json'
                                                                    },
                                                                    credentials: 'include',
                                                                    body: JSON.stringify({
                                                                        name: profile.name,
                                                                        email: profile.email
                                                                    })
                                                                });
                                                                const contentType = response.headers.get('content-type') || '';
                                                                if (!contentType.includes('application/json')) {
                                                                    const text = await response.text();
                                                                    throw new Error(text || 'Unexpected server response');
                                                                }
                                                                const data = await response.json();
                                                                if (!response.ok) {
                                                                    throw new Error(data.error || 'Failed to save');
                                                                }
                                                                setProfile({
                                                                    name: data.data?.name || '',
                                                                    email: data.data?.email || '',
                                                                    phone: data.data?.phone || ''
                                                                });
                                                                await refresh();
                                                                setSaveStatus('Profile updated.');
                                                                setTimeout(()=>setSaveStatus(''), 2000);
                                                            } catch (error) {
                                                                console.error('Failed to save profile:', error);
                                                                setSaveStatus(error.message);
                                                            }
                                                        },
                                                        disabled: profileLoading,
                                                        children: "Save Changes"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 383,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Button$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                        variant: "outline",
                                                        onClick: async ()=>{
                                                            setProfileLoading(true);
                                                            setProfileError('');
                                                            try {
                                                                const response = await fetch('/api/profile');
                                                                const data = await response.json();
                                                                if (!response.ok) {
                                                                    throw new Error(data.error || 'Failed to reset');
                                                                }
                                                                setProfile({
                                                                    name: data.data?.name || '',
                                                                    email: data.data?.email || '',
                                                                    phone: data.data?.phone || ''
                                                                });
                                                                setProfilePhoto(null);
                                                                setProfilePhotoPreview(null);
                                                                setSaveStatus('');
                                                            } catch (error) {
                                                                setProfileError(error.message);
                                                            } finally{
                                                                setProfileLoading(false);
                                                            }
                                                        },
                                                        disabled: profileLoading,
                                                        children: "Reset"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 423,
                                                        columnNumber: 19
                                                    }, this),
                                                    saveStatus && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: `text-sm font-semibold ${saveStatus.includes('Failed') || saveStatus.includes('error') ? 'text-red-600' : 'text-green-600'}`,
                                                        children: saveStatus
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 453,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/settings/page.js",
                                                lineNumber: 382,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/settings/page.js",
                                        lineNumber: 293,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/settings/page.js",
                                lineNumber: 291,
                                columnNumber: 13
                            }, this),
                            activeTab === 'appearance' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Card$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-2xl font-bold text-aa-dark-blue mb-6",
                                        children: "Appearance"
                                    }, void 0, false, {
                                        fileName: "[project]/app/settings/page.js",
                                        lineNumber: 492,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "block text-sm font-semibold text-aa-text-dark mb-3",
                                                        children: "Theme"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 495,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "grid grid-cols-2 gap-4",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "p-4 border-2 border-aa-orange rounded-lg cursor-pointer bg-white",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "w-full h-24 bg-gradient-to-br from-aa-orange to-aa-dark-blue rounded-lg mb-3"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/settings/page.js",
                                                                        lineNumber: 498,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "font-semibold text-aa-text-dark",
                                                                        children: "Default Theme"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/settings/page.js",
                                                                        lineNumber: 499,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Badge$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                        variant: "orange",
                                                                        className: "mt-2",
                                                                        children: "Active"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/settings/page.js",
                                                                        lineNumber: 500,
                                                                        columnNumber: 23
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/settings/page.js",
                                                                lineNumber: 497,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-aa-orange",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "w-full h-24 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg mb-3"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/settings/page.js",
                                                                        lineNumber: 503,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "font-semibold text-aa-text-dark",
                                                                        children: "Dark Theme"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/settings/page.js",
                                                                        lineNumber: 504,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Badge$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                        variant: "default",
                                                                        className: "mt-2",
                                                                        children: "Coming Soon"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/settings/page.js",
                                                                        lineNumber: 505,
                                                                        columnNumber: 23
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/settings/page.js",
                                                                lineNumber: 502,
                                                                columnNumber: 21
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 496,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/settings/page.js",
                                                lineNumber: 494,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "block text-sm font-semibold text-aa-text-dark mb-3",
                                                        children: "Accent Color"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 511,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex gap-3",
                                                        children: [
                                                            '#FF6B00',
                                                            '#0A1F44',
                                                            '#4CAF50',
                                                            '#2196F3',
                                                            '#9C27B0',
                                                            '#F44336'
                                                        ].map((color)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                className: "w-12 h-12 rounded-lg border-2 border-gray-200 hover:border-aa-dark-blue",
                                                                style: {
                                                                    backgroundColor: color
                                                                }
                                                            }, color, false, {
                                                                fileName: "[project]/app/settings/page.js",
                                                                lineNumber: 514,
                                                                columnNumber: 23
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 512,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/settings/page.js",
                                                lineNumber: 510,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/settings/page.js",
                                        lineNumber: 493,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/settings/page.js",
                                lineNumber: 491,
                                columnNumber: 13
                            }, this),
                            activeTab === 'whatsapp' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Card$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-2xl font-bold text-aa-dark-blue mb-6",
                                        children: "WhatsApp Configuration"
                                    }, void 0, false, {
                                        fileName: "[project]/app/settings/page.js",
                                        lineNumber: 529,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: `p-6 border-2 rounded-lg ${whatsappTone === 'green' ? 'bg-green-50 border-green-200' : whatsappTone === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-3 mb-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: `w-3 h-3 rounded-full ${whatsappTone === 'green' ? 'bg-green-500 animate-pulse' : whatsappTone === 'amber' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/settings/page.js",
                                                                lineNumber: 541,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: `font-semibold ${whatsappTone === 'green' ? 'text-green-700' : whatsappTone === 'amber' ? 'text-amber-700' : 'text-red-700'}`,
                                                                children: whatsappStatusLabel
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/settings/page.js",
                                                                lineNumber: 550,
                                                                columnNumber: 21
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 540,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: `text-sm ${whatsappTone === 'green' ? 'text-green-600' : whatsappTone === 'amber' ? 'text-amber-600' : 'text-red-600'}`,
                                                        children: whatsappStatusMessage
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 562,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/settings/page.js",
                                                lineNumber: 531,
                                                columnNumber: 17
                                            }, this),
                                            !whatsappConnected && whatsappQr && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-200 rounded-lg bg-white",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                        src: whatsappQr,
                                                        alt: "WhatsApp QR Code",
                                                        className: "w-56 h-56"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 577,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm text-aa-gray text-center",
                                                        children: "Open WhatsApp on your phone → Linked Devices → Link a device"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 582,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/settings/page.js",
                                                lineNumber: 576,
                                                columnNumber: 19
                                            }, this),
                                            whatsappActionStatus && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm",
                                                children: whatsappActionStatus
                                            }, void 0, false, {
                                                fileName: "[project]/app/settings/page.js",
                                                lineNumber: 589,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Input$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                label: "Phone Number",
                                                value: whatsappConfig.phone,
                                                onChange: (event)=>setWhatsappConfig((prev)=>({
                                                            ...prev,
                                                            phone: event.target.value
                                                        })),
                                                placeholder: "Not connected",
                                                disabled: true
                                            }, void 0, false, {
                                                fileName: "[project]/app/settings/page.js",
                                                lineNumber: 594,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Input$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                label: "Business Name",
                                                value: whatsappConfig.businessName,
                                                onChange: (event)=>setWhatsappConfig((prev)=>({
                                                            ...prev,
                                                            businessName: event.target.value
                                                        })),
                                                placeholder: "Not connected",
                                                disabled: true
                                            }, void 0, false, {
                                                fileName: "[project]/app/settings/page.js",
                                                lineNumber: 601,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Input$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                label: "Business Category",
                                                value: whatsappConfig.category,
                                                onChange: (event)=>setWhatsappConfig((prev)=>({
                                                            ...prev,
                                                            category: event.target.value
                                                        })),
                                                disabled: !whatsappConnected
                                            }, void 0, false, {
                                                fileName: "[project]/app/settings/page.js",
                                                lineNumber: 608,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex gap-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Button$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                        variant: "primary",
                                                        onClick: handleStartWhatsApp,
                                                        disabled: whatsappConnected || whatsappStatus === 'starting',
                                                        children: whatsappConnected ? 'Configured' : whatsappStatus === 'starting' ? 'Starting...' : 'Connect WhatsApp'
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 616,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Button$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                        variant: "outline",
                                                        className: "text-red-600 border-red-600 hover:bg-red-50",
                                                        onClick: handleDisconnectWhatsApp,
                                                        disabled: !canDisconnect,
                                                        children: "Disconnect"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 627,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/settings/page.js",
                                                lineNumber: 615,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/settings/page.js",
                                        lineNumber: 530,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/settings/page.js",
                                lineNumber: 528,
                                columnNumber: 13
                            }, this),
                            activeTab === 'security' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Card$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-2xl font-bold text-aa-dark-blue mb-6",
                                        children: "Security Settings"
                                    }, void 0, false, {
                                        fileName: "[project]/app/settings/page.js",
                                        lineNumber: 676,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                        className: "font-semibold text-aa-text-dark mb-4",
                                                        children: "Change Password"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 679,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "space-y-4",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Input$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                label: "Current Password",
                                                                type: "password",
                                                                placeholder: "Enter current password",
                                                                value: passwordForm.current,
                                                                onChange: updatePasswordField('current'),
                                                                disabled: passwordLoading
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/settings/page.js",
                                                                lineNumber: 681,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Input$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                label: "New Password",
                                                                type: "password",
                                                                placeholder: "Enter new password",
                                                                value: passwordForm.next,
                                                                onChange: updatePasswordField('next'),
                                                                disabled: passwordLoading
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/settings/page.js",
                                                                lineNumber: 689,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Input$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                label: "Confirm Password",
                                                                type: "password",
                                                                placeholder: "Confirm new password",
                                                                value: passwordForm.confirm,
                                                                onChange: updatePasswordField('confirm'),
                                                                disabled: passwordLoading
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/settings/page.js",
                                                                lineNumber: 697,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex items-center gap-3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Button$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                        variant: "primary",
                                                                        onClick: async ()=>{
                                                                            setPasswordStatus('');
                                                                            if (!passwordForm.next || passwordForm.next.length < 8) {
                                                                                setPasswordStatus('New password must be at least 8 characters.');
                                                                                return;
                                                                            }
                                                                            if (passwordForm.next !== passwordForm.confirm) {
                                                                                setPasswordStatus('Passwords do not match.');
                                                                                return;
                                                                            }
                                                                            setPasswordLoading(true);
                                                                            try {
                                                                                const response = await fetch('/api/profile/password', {
                                                                                    method: 'POST',
                                                                                    headers: {
                                                                                        'Content-Type': 'application/json'
                                                                                    },
                                                                                    credentials: 'include',
                                                                                    body: JSON.stringify({
                                                                                        currentPassword: passwordForm.current,
                                                                                        newPassword: passwordForm.next
                                                                                    })
                                                                                });
                                                                                const data = await response.json();
                                                                                if (!response.ok) {
                                                                                    throw new Error(data.error || 'Failed to update password.');
                                                                                }
                                                                                setPasswordForm({
                                                                                    current: '',
                                                                                    next: '',
                                                                                    confirm: ''
                                                                                });
                                                                                setPasswordStatus('Password updated.');
                                                                            } catch (error) {
                                                                                setPasswordStatus(error.message);
                                                                            } finally{
                                                                                setPasswordLoading(false);
                                                                            }
                                                                        },
                                                                        disabled: passwordLoading,
                                                                        children: passwordLoading ? 'Updating...' : 'Update Password'
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/settings/page.js",
                                                                        lineNumber: 706,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    passwordStatus && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: `text-sm font-semibold ${passwordStatus.includes('updated') ? 'text-green-600' : 'text-red-600'}`,
                                                                        children: passwordStatus
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/settings/page.js",
                                                                        lineNumber: 746,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/settings/page.js",
                                                                lineNumber: 705,
                                                                columnNumber: 21
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 680,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/settings/page.js",
                                                lineNumber: 678,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "pt-6 border-t border-gray-200",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                        className: "font-semibold text-aa-text-dark mb-4",
                                                        children: "Two-Factor Authentication"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 755,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center justify-between p-4 bg-gray-50 rounded-lg",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "font-semibold text-aa-text-dark",
                                                                        children: "Enable 2FA"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/settings/page.js",
                                                                        lineNumber: 758,
                                                                        columnNumber: 23
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "text-sm text-aa-gray mt-1",
                                                                        children: "Add an extra layer of security to your account"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/settings/page.js",
                                                                        lineNumber: 759,
                                                                        columnNumber: 23
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/settings/page.js",
                                                                lineNumber: 757,
                                                                columnNumber: 21
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Button$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                variant: "outline",
                                                                children: "Enable"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/settings/page.js",
                                                                lineNumber: 761,
                                                                columnNumber: 21
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 756,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/settings/page.js",
                                                lineNumber: 754,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "pt-6 border-t border-gray-200",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                        className: "font-semibold text-aa-text-dark mb-4",
                                                        children: "Active Sessions"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 766,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "space-y-3",
                                                        children: [
                                                            {
                                                                device: 'Chrome on Windows',
                                                                location: 'Mumbai, India',
                                                                time: 'Active now'
                                                            },
                                                            {
                                                                device: 'Safari on iPhone',
                                                                location: 'Delhi, India',
                                                                time: '2 hours ago'
                                                            }
                                                        ].map((session, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                className: "font-semibold text-aa-text-dark",
                                                                                children: session.device
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/app/settings/page.js",
                                                                                lineNumber: 774,
                                                                                columnNumber: 27
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                className: "text-sm text-aa-gray",
                                                                                children: [
                                                                                    session.location,
                                                                                    " • ",
                                                                                    session.time
                                                                                ]
                                                                            }, void 0, true, {
                                                                                fileName: "[project]/app/settings/page.js",
                                                                                lineNumber: 775,
                                                                                columnNumber: 27
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/app/settings/page.js",
                                                                        lineNumber: 773,
                                                                        columnNumber: 25
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$common$2f$Button$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                        variant: "ghost",
                                                                        className: "text-red-600",
                                                                        children: "Revoke"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/settings/page.js",
                                                                        lineNumber: 777,
                                                                        columnNumber: 25
                                                                    }, this)
                                                                ]
                                                            }, idx, true, {
                                                                fileName: "[project]/app/settings/page.js",
                                                                lineNumber: 772,
                                                                columnNumber: 23
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/settings/page.js",
                                                        lineNumber: 767,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/settings/page.js",
                                                lineNumber: 765,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/settings/page.js",
                                        lineNumber: 677,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/settings/page.js",
                                lineNumber: 675,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/settings/page.js",
                        lineNumber: 288,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/settings/page.js",
                lineNumber: 263,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/settings/page.js",
        lineNumber: 257,
        columnNumber: 5
    }, this);
}
_s(SettingsPage, "f9/y33vs2lRgpvahS2893jt9Q1o=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$auth$2f$AuthProvider$2e$jsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"]
    ];
});
_c = SettingsPage;
var _c;
__turbopack_context__.k.register(_c, "SettingsPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=app_72a4f11c._.js.map
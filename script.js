// // --- ثابت‌های مربوط به تقویم کاری و تخصیص بودجه ---
// const MONTH_DAYS = 30;
// const AGENT_OFF_DAYS_PER_MONTH = 4;
// const AGENT_PAID_LEAVE_DAYS_PER_MONTH = 3;
// const DAILY_REST_MINUTES = 45; // دقیقه
// const DAILY_SHIFT_HOURS = 8; // ساعت شیفت روزانه

// // محاسبه ساعات کاری خالص قابل انتظار از یک کارشناس در طول یک ماه
// const USABLE_WORK_DAYS_PER_MONTH =
//     MONTH_DAYS - AGENT_OFF_DAYS_PER_MONTH - AGENT_PAID_LEAVE_DAYS_PER_MONTH;
// const USABLE_HOURS_PER_WORKING_DAY = DAILY_SHIFT_HOURS - DAILY_REST_MINUTES / 60;
// const AVERAGE_MONTHLY_USABLE_HOURS =
//     USABLE_WORK_DAYS_PER_MONTH * USABLE_HOURS_PER_WORKING_DAY; // تقریباً 166.75 ساعت

// // --- درصد تخصیص بودجه به‌صورت قابل پیکربندی ---
// let gradeAllocationPercentages = {
//     A: 0.6,
//     B: 0.3,
//     C: 0.1
// };

// /**
//  * تابعی برای تنظیم درصدهای تخصیص بودجه بین گریدها.
//  * مجموع درصدها باید تقریباً برابر با 1 باشد.
//  * @param {object} newPercentages - یک شیء شامل درصدهای جدید برای گرید A, B, C.
//  */
// function setGradeAllocationPercentages(newPercentages) {
//     const total = Object.values(newPercentages).reduce((sum, p) => sum + p, 0);
//     if (Math.abs(total - 1.0) > 0.01) {
//         console.warn("مجموع درصدها باید تقریباً برابر با ۱ (۱۰۰٪) باشد. تنظیمات اعمال نشد.");
//         return;
//     }
//     gradeAllocationPercentages = { ...newPercentages };
//     console.log("درصدهای تخصیص بودجه به روز شد:", gradeAllocationPercentages);
// }

// /* ========= داده کارشناسان ========= */
// let agents = [];

// /* ========= محاسبات اصلی ========= */

// /**
//  * تابع اصلی برای محاسبه امتیاز گریدینگ یک کارشناس.
//  * این تابع فقط امتیاز خام (raw score) را محاسبه می‌کند که به عنوان امتیاز نهایی استفاده می‌شود.
//  */
// function calculateGradingScore(
//     agentChatCount,
//     incomingCallCount,
//     outgoingCallCount,
//     identityVerificationCount,
//     agentTalkTimeHours,
//     isIdentityVerifier,
//     shiftType,
//     totalChatsAcrossAllAgents,
//     averageChatDurationPerTeamMonth,
//     averageIdentityVerificationDurationMinutes
// ) {
//     // ثابت‌های وزن‌دهی فعالیت‌ها و ضریب تبدیل
//     const CHAT_WEIGHT = 0.8;
//     const INCOMING_CALL_WEIGHT = 1.0;
//     const OUTGOING_CALL_WEIGHT = 0.5;
//     const IDENTITY_VERIFICATION_WEIGHT = 1.2;
//     // کلیدی‌ترین ضریب برای کالیبراسیون: هرچه کمتر، فعالیت‌ها تأثیر کمتری بر جبران زمان مفید پایین دارند.
//     const ACTIVITY_VALUE_TO_SCORE_CONVERSION_FACTOR = 0.05; // این مقدار را کالیبره کنید.

//     // ضرایب سختی شیفت
//     const SHIFT_MULTIPLIERS = {
//         normal: 1.0,
//         twilight_no_call_activity: 1.1,
//         twilight_full_activity: 1.2,
//         evening_premium: 1.15,
//     };

//     /* --- محاسبه "زمان فعالیت مفید" کارشناس در مقیاس ماهانه --- */
//     let chatTime = 0;
//     // اگر داده‌های تیمی چت موجود باشد، سهم کارشناس از کل زمان چت محاسبه می‌شود.
//     if (totalChatsAcrossAllAgents > 0 && averageChatDurationPerTeamMonth > 0) {
//         chatTime = (agentChatCount / totalChatsAcrossAllAgents) * averageChatDurationPerTeamMonth;
//     } else if (agentChatCount > 0) {
//         // Fallback: اگر داده تیمی نباشد، هر چت را 5 دقیقه (5/60 ساعت) فرض می‌کنیم.
//         chatTime = agentChatCount * (5 / 60);
//     }

//     const callTime = agentTalkTimeHours; // Talk Time مستقیماً به عنوان زمان مفید حساب می‌شود.
//     // زمان احراز هویت (تبدیل از دقیقه به ساعت)
//     const identityVerificationTime = (identityVerificationCount * averageIdentityVerificationDurationMinutes) / 60;
//     const totalUsefulActivityTime = chatTime + callTime + identityVerificationTime;

//     /* --- محاسبه "امتیاز پایه زمان مفید" (usefulTimeScore) --- */
//     const usefulTimeRatio = totalUsefulActivityTime / AVERAGE_MONTHLY_USABLE_HOURS;
//     let usefulTimeScore = usefulTimeRatio * 100; // امتیاز اولیه از 0 تا 100 بر اساس نسبت زمان مفید

//     // جریمه شدیدتر برای زمان مفید پایین: اگر کمتر از 70% ساعات قابل استفاده باشد.
//     const LOW_USEFUL_TIME_PENALTY_THRESHOLD = 0.70;
//     if (usefulTimeRatio < LOW_USEFUL_TIME_PENALTY_THRESHOLD) {
//         usefulTimeScore *= (usefulTimeRatio / LOW_USEFUL_TIME_PENALTY_THRESHOLD);
//         console.warn(`هشدار: زمان مفید کارشناس (${totalUsefulActivityTime.toFixed(2)} ساعت) پایین‌تر از حد انتظار است. امتیاز زمان مفید به ${usefulTimeScore.toFixed(2)} کاهش یافت.`);
//     }
//     // اطمینان از اینکه امتیاز زمان مفید از 100 تجاوز نکند.
//     usefulTimeScore = Math.min(usefulTimeScore, 100);

//     /* --- محاسبه "ارزش افزوده فعالیت‌های وزن‌دهی شده" (totalWeightedActivityValue) --- */
//     let totalWeightedActivityValue = 0;

//     // تابع کمکی برای اضافه کردن به ارزش وزن‌دهی شده (خوانایی بالاتر)
//     const addWeightedActivity = (count, weight, multiplier) => {
//         totalWeightedActivityValue += count * weight * multiplier;
//     };

//     // اعمال ضرایب شیفت بر اساس نوع شیفت
//     if (shiftType === "morning") {
//         if (!isIdentityVerifier) addWeightedActivity(agentChatCount, CHAT_WEIGHT, SHIFT_MULTIPLIERS.normal);
//         addWeightedActivity(incomingCallCount, INCOMING_CALL_WEIGHT, SHIFT_MULTIPLIERS.normal);
//         addWeightedActivity(outgoingCallCount, OUTGOING_CALL_WEIGHT, SHIFT_MULTIPLIERS.normal);
//         addWeightedActivity(identityVerificationCount, IDENTITY_VERIFICATION_WEIGHT, SHIFT_MULTIPLIERS.normal);
//     } else if (shiftType === "evening") {
//         const normalEveningDuration = 22 - 17.25; // 17:15 تا 22:00
//         const premiumEveningDuration = 25.5 - 22; // 22:00 تا 01:30 (25.5 = 24 + 1.5)
//         const totalEveningShiftDuration = normalEveningDuration + premiumEveningDuration;

//         if (totalEveningShiftDuration > 0) {
//             const normalRatio = normalEveningDuration / totalEveningShiftDuration;
//             const premiumRatio = premiumEveningDuration / totalEveningShiftDuration;
//             const mixedMultiplier = normalRatio * SHIFT_MULTIPLIERS.normal + premiumRatio * SHIFT_MULTIPLIERS.evening_premium;

//             if (!isIdentityVerifier) addWeightedActivity(agentChatCount, CHAT_WEIGHT, mixedMultiplier);
//             addWeightedActivity(incomingCallCount, INCOMING_CALL_WEIGHT, mixedMultiplier);
//             addWeightedActivity(outgoingCallCount, OUTGOING_CALL_WEIGHT, mixedMultiplier);
//             addWeightedActivity(identityVerificationCount, IDENTITY_VERIFICATION_WEIGHT, mixedMultiplier);
//         } else {
//             // Fallback: اگر مدت شیفت صفر باشد (نباید رخ دهد)
//             if (!isIdentityVerifier) addWeightedActivity(agentChatCount, CHAT_WEIGHT, SHIFT_MULTIPLIERS.normal);
//             addWeightedActivity(incomingCallCount, INCOMING_CALL_WEIGHT, SHIFT_MULTIPLIERS.normal);
//             addWeightedActivity(outgoingCallCount, OUTGOING_CALL_WEIGHT, SHIFT_MULTIPLIERS.normal);
//             addWeightedActivity(identityVerificationCount, IDENTITY_VERIFICATION_WEIGHT, SHIFT_MULTIPLIERS.normal);
//         }
//     } else if (shiftType === "twilight") {
//         const noCallTwilightDuration = 7 - 1.5; // 01:30 تا 07:00
//         const withCallTwilightDuration = 9 - 7; // 07:00 تا 09:00
//         const totalTwilightShiftDuration = noCallTwilightDuration + withCallTwilightDuration;

//         if (totalTwilightShiftDuration > 0) {
//             const noCallRatio = noCallTwilightDuration / totalTwilightShiftDuration;
//             const withCallRatio = withCallTwilightDuration / totalTwilightShiftDuration;
//             const mixedMultiplier = noCallRatio * SHIFT_MULTIPLIERS.twilight_no_call_activity + withCallRatio * SHIFT_MULTIPLIERS.twilight_full_activity;

//             if (!isIdentityVerifier) addWeightedActivity(agentChatCount, CHAT_WEIGHT, mixedMultiplier);
//             addWeightedActivity(identityVerificationCount, IDENTITY_VERIFICATION_WEIGHT, mixedMultiplier);

//             // تماس‌ها فقط در بخش "با تماس" شیفت بامداد امتیاز می‌گیرند
//             addWeightedActivity(incomingCallCount, INCOMING_CALL_WEIGHT, withCallRatio * SHIFT_MULTIPLIERS.twilight_full_activity);
//             addWeightedActivity(outgoingCallCount, OUTGOING_CALL_WEIGHT, withCallRatio * SHIFT_MULTIPLIERS.twilight_full_activity);

//             if ((incomingCallCount > 0 || outgoingCallCount > 0) && noCallRatio > 0.01) {
//                 console.warn(`هشدار: کارشناس ${shiftType} تماس ثبت کرده، اما بخش عمده شیفت او بدون تماس است. فقط تماس‌های بخش 07:00-09:00 محاسبه شد.`);
//             }
//         } else {
//             // Fallback: اگر مدت شیفت صفر باشد
//             if (!isIdentityVerifier) addWeightedActivity(agentChatCount, CHAT_WEIGHT, SHIFT_MULTIPLIERS.twilight_no_call_activity);
//             addWeightedActivity(identityVerificationCount, IDENTITY_VERIFICATION_WEIGHT, SHIFT_MULTIPLIERS.twilight_no_call_activity);
//         }
//     } else {
//         // حالت پیش‌فرض برای شیفت‌های نامشخص یا نرمال
//         if (!isIdentityVerifier) addWeightedActivity(agentChatCount, CHAT_WEIGHT, SHIFT_MULTIPLIERS.normal);
//         addWeightedActivity(incomingCallCount, INCOMING_CALL_WEIGHT, SHIFT_MULTIPLIERS.normal);
//         addWeightedActivity(outgoingCallCount, OUTGOING_CALL_WEIGHT, SHIFT_MULTIPLIERS.normal);
//         addWeightedActivity(identityVerificationCount, IDENTITY_VERIFICATION_WEIGHT, SHIFT_MULTIPLIERS.normal);
//     }

//     /* --- محاسبه امتیاز نهایی (که همان امتیاز خام است) --- */
//     // rawScoreBeforeNormalization = امتیاز پایه زمان مفید + امتیاز افزوده از فعالیت‌های وزن‌دهی شده
//     let finalScore = usefulTimeScore + (totalWeightedActivityValue * ACTIVITY_VALUE_TO_SCORE_CONVERSION_FACTOR);

//     // اطمینان از اینکه امتیاز نهایی از سقف 100 تجاوز نکند و حداقل 0 باشد.
//     finalScore = Math.min(finalScore, 100);
//     finalScore = Math.max(0, finalScore);

//     return {
//         totalUsefulActivityTime: totalUsefulActivityTime,
//         score: finalScore, // این امتیاز، همان امتیاز خام و نهایی است.
//     };
// }

// /**
//  * تابع برای تعیین گرید بر اساس امتیاز نهایی (که در این نسخه همان امتیاز خام است).
//  * @param {number} score - امتیاز نهایی کارشناس.
//  * @returns {string} گرید تخصیص یافته ('A', 'B', یا 'C').
//  */
// function assignGrade(score) {
//     if (score >= 85) return "A"; // گرید A برای امتیاز 85 و بالاتر
//     if (score >= 65) return "B"; // گرید B برای امتیاز 65 تا کمتر از 85
//     return "C";                  // گرید C برای امتیاز کمتر از 65
// }

// /**
//  * بودجه تخصیص یافته برای گرید خاص را محاسبه می‌کند.
//  * @param {number} totalBudget - کل بودجه موجود برای تخصیص.
//  * @param {string} grade - گرید کارشناس ('A', 'B', یا 'C').
//  * @returns {number} مقدار بودجه تخصیص یافته برای کارشناس.
//  */
// function allocateBudgetByGrade(totalBudget, grade) {
//     return totalBudget * (gradeAllocationPercentages[grade] ?? 0);
// }

// /* ========= DOM helpers (توابع کمکی برای دستکاری رابط کاربری) ========= */

// /** پر کردن دراپ‌داون انتخاب کارشناس با لیست کارشناسان فعلی. */
// function populateAgentSelect() {
//     const agentSelect = document.getElementById("agentSelect");
//     agentSelect.innerHTML = '<option value="">-- یک کارشناس را انتخاب کنید --</option>'; // گزینه پیش‌فرض

//     // مرتب‌سازی کارشناسان بر اساس نام و اضافه کردن به دراپ‌داون
//     [...agents]
//     .sort((a, b) => a.name.localeCompare(b.name, "fa", {
//         sensitivity: "base"
//     }))
//     .forEach((agent) => {
//         const option = document.createElement("option");
//         option.value = agent.id;
//         option.textContent = agent.name;
//         agentSelect.appendChild(option);
//     });
// }

// /** بروزرسانی جدول نمایش گریدینگ کارشناسان. */
// function updateGradingTable() {
//     const gradingTableBody = document.getElementById("gradingTableBody");
//     gradingTableBody.innerHTML = ""; // پاک کردن محتوای قبلی جدول

//     // ترتیب گریدها برای مرتب‌سازی
//     const gradeOrder = {
//         A: 1,
//         B: 2,
//         C: 3
//     };

//     // مرتب‌سازی کارشناسان: ابتدا بر اساس گرید، سپس امتیاز نهایی، و در نهایت نام.
//     [...agents]
//     .sort((a, b) => {
//         // مرتب‌سازی بر اساس گرید
//         if (gradeOrder[a.performance.grade] !== gradeOrder[b.performance.grade]) {
//             return gradeOrder[a.performance.grade] - gradeOrder[b.performance.grade];
//         }
//         // مرتب‌سازی بر اساس امتیاز نهایی (از بالاتر به پایین‌تر)
//         if (b.performance.score !== a.performance.score) {
//             return b.performance.score - a.performance.score;
//         }
//         // مرتب‌سازی بر اساس نام (برای موارد مساوی)
//         return a.name.localeCompare(b.name, "fa", {
//             sensitivity: "base"
//         });
//     })
//     .forEach((agent) => {
//         const row = gradingTableBody.insertRow();
//         row.insertCell().textContent = agent.name;
//         row.insertCell().textContent = agent.isIdentityVerifier ? "بله" : "خیر";
//         row.insertCell().textContent = agent.performance.chatCount;
//         row.insertCell().textContent = agent.performance.incomingCallCount;
//         row.insertCell().textContent = agent.performance.outgoingCallCount;
//         row.insertCell().textContent = agent.performance.agentTalkTimeHours.toFixed(2);
//         row.insertCell().textContent = agent.performance.identityVerificationCount;
//         row.insertCell().textContent = agent.performance.totalUsefulActivityTime.toFixed(2);
//         row.insertCell().textContent = agent.performance.score.toFixed(2); // نمایش امتیاز نهایی (که همان خام است)
//         const gradeCell = row.insertCell();
//         gradeCell.textContent = agent.performance.grade;
//         gradeCell.classList.add(`grade-${agent.performance.grade}`); // اضافه کردن کلاس CSS برای رنگ‌بندی
//     });
// }

// /* ========= روال‌های فرم (توابع مدیریت تعاملات کاربری) ========= */

// /** ثبت کارشناس جدید در سیستم. */
// function registerAgent() {
//     const agentNameInput = document.getElementById("agentName");
//     const registerIsIdentityVerifierCheckbox = document.getElementById("registerIsIdentityVerifier");
//     const name = agentNameInput.value.trim();
//     const isIdVerifier = registerIsIdentityVerifierCheckbox.checked;

//     if (!name) {
//         alert("لطفاً نام کارشناس را وارد کنید.");
//         return;
//     }
//     if (agents.some((agent) => agent.name === name)) {
//         alert(`کارشناس با نام "${name}" قبلاً ثبت شده است.`);
//         return;
//     }

//     agents.push({
//         id: Date.now().toString(), // یک ID یکتا بر اساس زمان
//         name,
//         isIdentityVerifier: isIdVerifier,
//         performance: {
//             // مقادیر اولیه عملکرد
//             chatCount: 0,
//             incomingCallCount: 0,
//             outgoingCallCount: 0,
//             identityVerificationCount: 0,
//             agentTalkTimeHours: 0,
//             totalUsefulActivityTime: 0,
//             score: 0, // اینجا همان امتیاز خام را ذخیره می کنیم
//             grade: "C",
//             shift: "morning",
//         },
//     });

//     populateAgentSelect(); // بروزرسانی دراپ‌داون
//     updateGradingTable(); // بروزرسانی جدول
//     agentNameInput.value = ""; // پاک کردن فیلد ورودی
//     registerIsIdentityVerifierCheckbox.checked = false;
//     alert(`کارشناس "${name}" با موفقیت ثبت شد.`);
// }

// /** محاسبه و ذخیره گرید و بودجه برای کارشناس انتخاب شده. */
// function calculateAndSaveGrade() {
//     const selectedAgentId = document.getElementById("agentSelect").value;
//     if (!selectedAgentId) {
//         alert("لطفاً یک کارشناس را انتخاب کنید.");
//         return;
//     }
//     const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);
//     if (!selectedAgent) {
//         alert("کارشناس یافت نشد."); // نباید رخ دهد اگر populateAgentSelect درست کار کند
//         return;
//     }

//     // گرفتن مقادیر عملکرد کارشناس انتخابی از رابط کاربری
//     const chatCount = +document.getElementById("chatCount").value || 0;
//     const incomingCallCount = +document.getElementById("incomingCallCount").value || 0;
//     const outgoingCallCount = +document.getElementById("outgoingCallCount").value || 0;
//     const agentTalkTimeHours = +document.getElementById("agentTalkTimeHours").value || 0;
//     const identityVerificationCount = +document.getElementById("identityVerificationCount").value || 0;
//     const shiftType = document.getElementById("shiftType").value;

//     // گرفتن مقادیر ورودی سراسری (تیم) از رابط کاربری
//     const totalChatsAcrossAllAgents = +document.getElementById("totalChatsAcrossAllAgents").value || 0;
//     const averageChatDurationPerTeamMonth = +document.getElementById("averageChatDurationPerAgent").value || 0;
//     const totalTalkTimeInTeamMonthHours = +document.getElementById("totalTalkTimeInShiftHours").value || 0; // این پارامتر دیگر در calculateGradingScore استفاده نمی شود
//     const averageIdentityVerificationDurationMinutes = +document.getElementById("averageIdentityVerificationDurationMinutes").value || 0;

//     // محاسبه امتیاز (که حالا فقط امتیاز خام است)
//     const calculationResults = calculateGradingScore(
//         chatCount,
//         incomingCallCount,
//         outgoingCallCount,
//         identityVerificationCount,
//         agentTalkTimeHours,
//         selectedAgent.isIdentityVerifier,
//         shiftType,
//         totalChatsAcrossAllAgents,
//         averageChatDurationPerTeamMonth,
//         averageIdentityVerificationDurationMinutes
//     );

//     // به‌روزرسانی شیء performance کارشناس در آرایه اصلی `agents`
//     selectedAgent.performance = {
//         chatCount,
//         incomingCallCount,
//         outgoingCallCount,
//         identityVerificationCount,
//         agentTalkTimeHours,
//         totalUsefulActivityTime: calculationResults.totalUsefulActivityTime,
//         score: calculationResults.score, // امتیاز نهایی همان امتیاز خام است
//         grade: assignGrade(calculationResults.score), // گریددهی بر اساس امتیاز نهایی
//         shift: shiftType,
//     };

//     // محاسبه و تخصیص بودجه
//     const totalBudget = +document.getElementById("totalBudget").value || 0;
//     const allocatedBudget = allocateBudgetByGrade(totalBudget, selectedAgent.performance.grade);

//     // نمایش نتیجه در رابط کاربری
//     document.getElementById("calculationResult").textContent =
//         `امتیاز نهایی: ${selectedAgent.performance.score.toFixed(2)} | ` +
//         `گرید: ${selectedAgent.performance.grade} | ` +
//         `زمان مفید: ${selectedAgent.performance.totalUsefulActivityTime.toFixed(2)}h از ${AVERAGE_MONTHLY_USABLE_HOURS.toFixed(2)}h | ` +
//         `بودجه: ${allocatedBudget.toFixed(2)} تومان`;

//     updateGradingTable(); // بروزرسانی جدول گریدینگ

//     // پاک کردن فیلدهای ورودی پس از محاسبه
//     document.getElementById("chatCount").value = "0";
//     document.getElementById("incomingCallCount").value = "0";
//     document.getElementById("outgoingCallCount").value = "0";
//     document.getElementById("agentTalkTimeHours").value = "0";
//     document.getElementById("identityVerificationCount").value = "0";
//     document.getElementById("shiftType").value = "morning";
//     document.getElementById("agentSelect").value = ''; // پاک کردن انتخاب دراپ‌داون
// }

// /* ========= رویدادها ========= */
// document.getElementById("registerAgentButton").addEventListener("click", registerAgent);
// document.getElementById("calculateGradeButton").addEventListener("click", calculateAndSaveGrade);

// // مدیریت رویداد تغییر دراپ‌داون انتخاب کارشناس: بارگذاری اطلاعات کارشناس
// document.getElementById('agentSelect').addEventListener('change', function() {
//     const selectedAgentId = this.value;
//     const chatCountInput = document.getElementById('chatCount');
//     const shiftTypeDropdown = document.getElementById('shiftType');
//     const incomingCallCountInput = document.getElementById('incomingCallCount');
//     const outgoingCallCountInput = document.getElementById('outgoingCallCount');
//     const agentTalkTimeHoursInput = document.getElementById('agentTalkTimeHours');
//     const identityVerificationCountInput = document.getElementById('identityVerificationCount');

//     if (selectedAgentId) {
//         const selectedAgent = agents.find(agent => agent.id === selectedAgentId);
//         if (selectedAgent) {
//             // غیرفعال کردن فیلد چت اگر کارشناس احراز هویت کننده باشد
//             if (selectedAgent.isIdentityVerifier) {
//                 chatCountInput.disabled = true;
//                 chatCountInput.value = '0';
//                 chatCountInput.style.backgroundColor = '#e9e9e9';
//                 chatCountInput.style.cursor = 'not-allowed';
//             } else {
//                 chatCountInput.disabled = false;
//                 chatCountInput.style.backgroundColor = '#fff';
//                 chatCountInput.style.cursor = 'text';
//             }

//             // بارگذاری مقادیر عملکرد ذخیره شده کارشناس در فیلدهای ورودی
//             chatCountInput.value = selectedAgent.performance.chatCount;
//             incomingCallCountInput.value = selectedAgent.performance.incomingCallCount;
//             outgoingCallCountInput.value = selectedAgent.performance.outgoingCallCount;
//             agentTalkTimeHoursInput.value = selectedAgent.performance.agentTalkTimeHours;
//             identityVerificationCountInput.value = selectedAgent.performance.identityVerificationCount;
//             shiftTypeDropdown.value = selectedAgent.performance.shift || 'morning';

//             document.getElementById('calculationResult').textContent = '';
//         }
//     } else {
//         // بازگرداندن فیلدها به حالت پیش‌فرض اگر کارشناسی انتخاب نشده باشد
//         chatCountInput.disabled = false;
//         chatCountInput.style.backgroundColor = '#fff';
//         chatCountInput.style.cursor = 'text';

//         // پاک کردن مقادیر فیلدها
//         chatCountInput.value = '0';
//         incomingCallCountInput.value = '0';
//         outgoingCallCountInput.value = '0';
//         agentTalkTimeHoursInput.value = '0';
//         identityVerificationCountInput.value = '0';
//         shiftTypeDropdown.value = 'morning';
//         document.getElementById('calculationResult').textContent = '';
//     }
// });

// // اجرای توابع هنگام بارگذاری کامل صفحه
// document.addEventListener("DOMContentLoaded", () => {
//     populateAgentSelect();
//     updateGradingTable();
// });


///// test////////
// --- ثابت‌های مربوط به تقویم کاری و تخصیص بودجه ---
const MONTH_DAYS = 30;
const AGENT_OFF_DAYS_PER_MONTH = 4;
const AGENT_PAID_LEAVE_DAYS_PER_MONTH = 3;
const DAILY_REST_MINUTES = 45; // دقیقه
const DAILY_SHIFT_HOURS = 8; // ساعت شیفت روزانه

// محاسبه ساعات کاری خالص قابل انتظار از یک کارشناس در طول یک ماه
const USABLE_WORK_DAYS_PER_MONTH =
    MONTH_DAYS - AGENT_OFF_DAYS_PER_MONTH - AGENT_PAID_LEAVE_DAYS_PER_MONTH;
const USABLE_HOURS_PER_WORKING_DAY = DAILY_SHIFT_HOURS - DAILY_REST_MINUTES / 60;
const AVERAGE_MONTHLY_USABLE_HOURS =
    USABLE_WORK_DAYS_PER_MONTH * USABLE_HOURS_PER_WORKING_DAY; // تقریباً 166.75 ساعت

// --- درصد تخصیص بودجه به‌صورت قابل پیکربندی (اینها برای تخصیص به *گریدها* است، نه به *هر فرد از آن گرید*) ---
// این درصدها اکنون نشان‌دهنده سهم گرید از کل بودجه گرید هستند.
let gradeBudgetDistributionPercentages = {
    A: 0.6, // 60% از کل بودجه گرید برای کارشناسان گرید A
    B: 0.3, // 30% از کل بودجه گرید برای کارشناسان گرید B
    C: 0.1  // 10% از کل بودجه گرید برای کارشناسان گرید C
};

/**
 * تابعی برای تنظیم درصدهای توزیع بودجه بین گریدها.
 * مجموع درصدها باید تقریباً برابر با 1 باشد.
 * @param {object} newPercentages - یک شیء شامل درصدهای جدید برای گرید A, B, C.
 */
function setGradeBudgetDistributionPercentages(newPercentages) {
    const total = Object.values(newPercentages).reduce((sum, p) => sum + p, 0);
    if (Math.abs(total - 1.0) > 0.01) {
        console.warn("مجموع درصدهای توزیع بودجه بین گریدها باید تقریباً برابر با ۱ (۱۰۰٪) باشد. تنظیمات اعمال نشد.");
        return;
    }
    gradeBudgetDistributionPercentages = { ...newPercentages };
    console.log("درصدهای توزیص بودجه به روز شد:", gradeBudgetDistributionPercentages);
}

/* ========= داده کارشناسان ========= */
// داده‌ها از LocalStorage بارگذاری می‌شوند
let agents = [];

// --- توابع کمکی برای LocalStorage ---
function saveAgentsToLocalStorage() {
    localStorage.setItem('agentsData', JSON.stringify(agents));
}

function loadAgentsFromLocalStorage() {
    const storedAgents = localStorage.getItem('agentsData');
    if (storedAgents) {
        agents = JSON.parse(storedAgents);
    }
}

/* ========= محاسبات اصلی ========= */

/**
 * تابع اصلی برای محاسبه امتیاز گریدینگ یک کارشناس.
 * این تابع فقط امتیاز خام (raw score) را محاسبه می‌کند که به عنوان امتیاز نهایی استفاده می‌شود.
 */
function calculateGradingScore(
    agentChatCount,
    incomingCallCount,
    outgoingCallCount,
    identityVerificationCount,
    agentTalkTimeHours,
    isIdentityVerifier,
    shiftType,
    totalChatsAcrossAllAgents,
    averageChatDurationPerTeamMonth,
    averageIdentityVerificationDurationMinutes
) {
    // ثابت‌های وزن‌دهی فعالیت‌ها و ضریب تبدیل
    const CHAT_WEIGHT = 0.8;
    const INCOMING_CALL_WEIGHT = 1.0;
    const OUTGOING_CALL_WEIGHT = 0.5;
    const IDENTITY_VERIFICATION_WEIGHT = 1.2;
    // کلیدی‌ترین ضریب برای کالیبراسیون: هرچه کمتر، فعالیت‌ها تأثیر کمتری بر جبران زمان مفید پایین دارند.
    const ACTIVITY_VALUE_TO_SCORE_CONVERSION_FACTOR = 0.05; // این مقدار را کالیبره کنید.

    // ضرایب سختی شیفت
    const SHIFT_MULTIPLIERS = {
        normal: 1.0,
        twilight_no_call_activity: 1.1,
        twilight_full_activity: 1.2,
        evening_premium: 1.15,
    };

    /* --- محاسبه "زمان فعالیت مفید" کارشناس در مقیاس ماهانه --- */
    let chatTime = 0;
    // اگر داده‌های تیمی چت موجود باشد، سهم کارشناس از کل زمان چت محاسبه می‌شود.
    if (totalChatsAcrossAllAgents > 0 && averageChatDurationPerTeamMonth > 0) {
        chatTime = (agentChatCount / totalChatsAcrossAllAgents) * averageChatDurationPerTeamMonth;
    } else if (agentChatCount > 0) {
        // Fallback: اگر داده تیمی نباشد، هر چت را 5 دقیقه (5/60 ساعت) فرض می‌کنیم.
        chatTime = agentChatCount * (5 / 60);
    }

    const callTime = agentTalkTimeHours; // Talk Time مستقیماً به عنوان زمان مفید حساب می‌شود.
    // زمان احراز هویت (تبدیل از دقیقه به ساعت)
    const identityVerificationTime = (identityVerificationCount * averageIdentityVerificationDurationMinutes) / 60;
    const totalUsefulActivityTime = chatTime + callTime + identityVerificationTime;

    /* --- محاسبه "امتیاز پایه زمان مفید" (usefulTimeScore) --- */
    const usefulTimeRatio = totalUsefulActivityTime / AVERAGE_MONTHLY_USABLE_HOURS;
    let usefulTimeScore = usefulTimeRatio * 100; // امتیاز اولیه از 0 تا 100 بر اساس نسبت زمان مفید

    // جریمه شدیدتر برای زمان مفید پایین: اگر کمتر از 70% ساعات قابل استفاده باشد.
    const LOW_USEFUL_TIME_PENALTY_THRESHOLD = 0.70;
    if (usefulTimeRatio < LOW_USEFUL_TIME_PENALTY_THRESHOLD) {
        usefulTimeScore *= (usefulTimeRatio / LOW_USEFUL_TIME_PENALTY_THRESHOLD);
        console.warn(`هشدار: زمان مفید کارشناس (${totalUsefulActivityTime.toFixed(2)} ساعت) پایین‌تر از حد انتظار است. امتیاز زمان مفید به ${usefulTimeScore.toFixed(2)} کاهش یافت.`);
    }
    // اطمینان از اینکه امتیاز زمان مفید از 100 تجاوز نکند.
    usefulTimeScore = Math.min(usefulTimeScore, 100);

    /* --- محاسبه "ارزش افزوده فعالیت‌های وزن‌دهی شده" (totalWeightedActivityValue) --- */
    let totalWeightedActivityValue = 0;

    // تابع کمکی برای اضافه کردن به ارزش وزن‌دهی شده (خوانایی بالاتر)
    const addWeightedActivity = (count, weight, multiplier) => {
        totalWeightedActivityValue += count * weight * multiplier;
    };

    // اعمال ضرایب شیفت بر اساس نوع شیفت
    if (shiftType === "morning") {
        if (!isIdentityVerifier) addWeightedActivity(agentChatCount, CHAT_WEIGHT, SHIFT_MULTIPLIERS.normal);
        addWeightedActivity(incomingCallCount, INCOMING_CALL_WEIGHT, SHIFT_MULTIPLIERS.normal);
        addWeightedActivity(outgoingCallCount, OUTGOING_CALL_WEIGHT, SHIFT_MULTIPLIERS.normal);
        addWeightedActivity(identityVerificationCount, IDENTITY_VERIFICATION_WEIGHT, SHIFT_MULTIPLIERS.normal);
    } else if (shiftType === "evening") {
        const normalEveningDuration = 22 - 17.25; // 17:15 تا 22:00
        const premiumEveningDuration = 25.5 - 22; // 22:00 تا 01:30 (25.5 = 24 + 1.5)
        const totalEveningShiftDuration = normalEveningDuration + premiumEveningDuration;

        if (totalEveningShiftDuration > 0) {
            const normalRatio = normalEveningDuration / totalEveningShiftDuration;
            const premiumRatio = premiumEveningDuration / totalEveningShiftDuration;
            const mixedMultiplier = normalRatio * SHIFT_MULTIPLIERS.normal + premiumRatio * SHIFT_MULTIPLIERS.evening_premium;

            if (!isIdentityVerifier) addWeightedActivity(agentChatCount, CHAT_WEIGHT, mixedMultiplier);
            addWeightedActivity(incomingCallCount, INCOMING_CALL_WEIGHT, mixedMultiplier);
            addWeightedActivity(outgoingCallCount, OUTGOING_CALL_WEIGHT, mixedMultiplier);
            addWeightedActivity(identityVerificationCount, IDENTITY_VERIFICATION_WEIGHT, mixedMultiplier);
        } else {
            // Fallback: اگر مدت شیفت صفر باشد (نباید رخ دهد)
            if (!isIdentityVerifier) addWeightedActivity(agentChatCount, CHAT_WEIGHT, SHIFT_MULTIPLIERS.normal);
            addWeightedActivity(incomingCallCount, INCOMING_CALL_WEIGHT, SHIFT_MULTIPLIERS.normal);
            addWeightedActivity(outgoingCallCount, OUTGOING_CALL_WEIGHT, SHIFT_MULTIPLIERS.normal);
            addWeightedActivity(identityVerificationCount, IDENTITY_VERIFICATION_WEIGHT, SHIFT_MULTIPLIERS.normal);
        }
    } else if (shiftType === "twilight") {
        const noCallTwilightDuration = 7 - 1.5; // 01:30 تا 07:00
        const withCallTwilightDuration = 9 - 7; // 07:00 تا 09:00
        const totalTwilightShiftDuration = noCallTwilightDuration + withCallTwilightDuration;

        if (totalTwilightShiftDuration > 0) {
            const noCallRatio = noCallTwilightDuration / totalTwilightShiftDuration;
            const withCallRatio = withCallTwilightDuration / totalTwilightShiftDuration;
            const mixedMultiplier = noCallRatio * SHIFT_MULTIPLIERS.twilight_no_call_activity + withCallRatio * SHIFT_MULTIPLIERS.twilight_full_activity;

            if (!isIdentityVerifier) addWeightedActivity(agentChatCount, CHAT_WEIGHT, mixedMultiplier);
            addWeightedActivity(identityVerificationCount, IDENTITY_VERIFICATION_WEIGHT, mixedMultiplier);

            // تماس‌ها فقط در بخش "با تماس" شیفت بامداد امتیاز می‌گیرند
            addWeightedActivity(incomingCallCount, INCOMING_CALL_WEIGHT, withCallRatio * SHIFT_MULTIPLIERS.twilight_full_activity);
            addWeightedActivity(outgoingCallCount, OUTGOING_CALL_WEIGHT, withCallRatio * SHIFT_MULTIPLIERS.twilight_full_activity);

            if ((incomingCallCount > 0 || outgoingCallCount > 0) && noCallRatio > 0.01) {
                console.warn(`هشدار: کارشناس ${shiftType} تماس ثبت کرده، اما بخش عمده شیفت او بدون تماس است. فقط تماس‌های بخش 07:00-09:00 محاسبه شد.`);
            }
        } else {
            // Fallback: اگر مدت شیفت صفر باشد
            if (!isIdentityVerifier) addWeightedActivity(agentChatCount, CHAT_WEIGHT, SHIFT_MULTIPLIERS.twilight_no_call_activity);
            addWeightedActivity(identityVerificationCount, IDENTITY_VERIFICATION_WEIGHT, SHIFT_MULTIPLIERS.twilight_no_call_activity);
        }
    } else {
        // حالت پیش‌فرض برای شیفت‌های نامشخص یا نرمال
        if (!isIdentityVerifier) addWeightedActivity(agentChatCount, CHAT_WEIGHT, SHIFT_MULTIPLIERS.normal);
        addWeightedActivity(incomingCallCount, INCOMING_CALL_WEIGHT, SHIFT_MULTIPLIERS.normal);
        addWeightedActivity(outgoingCallCount, OUTGOING_CALL_WEIGHT, SHIFT_MULTIPLIERS.normal);
        addWeightedActivity(identityVerificationCount, IDENTITY_VERIFICATION_WEIGHT, SHIFT_MULTIPLIERS.normal);
    }

    /* --- محاسبه امتیاز نهایی (که همان امتیاز خام است) --- */
    // finalScore = امتیاز پایه زمان مفید + امتیاز افزوده از فعالیت‌های وزن‌دهی شده
    let finalScore = usefulTimeScore + (totalWeightedActivityValue * ACTIVITY_VALUE_TO_SCORE_CONVERSION_FACTOR);

    // اطمینان از اینکه امتیاز نهایی از سقف 100 تجاوز نکند و حداقل 0 باشد.
    finalScore = Math.min(finalScore, 100);
    finalScore = Math.max(0, finalScore);

    return {
        totalUsefulActivityTime: totalUsefulActivityTime,
        score: finalScore, // این امتیاز، همان امتیاز خام و نهایی است.
    };
}

/**
 * تابع برای تعیین گرید بر اساس امتیاز نهایی (که در این نسخه همان امتیاز خام است).
 * @param {number} score - امتیاز نهایی کارشناس.
 * @returns {string} گرید تخصیص یافته ('A', 'B', یا 'C').
 */
function assignGrade(score) {
    if (score >= 90) return "A"; // گرید A برای امتیاز 90 و بالاتر
    if (score >= 65) return "B"; // گرید B برای امتیاز 65 تا کمتر از 90
    return "C";                  // گرید C برای امتیاز کمتر از 65
}

/**
 * تابع جدید: محاسبه و تخصیص بودجه بر اساس گرید، به طوری که مجموع بودجه گریدها از بودجه کل بیشتر نشود.
 * این تابع باید بعد از محاسبه گرید برای تمام کارشناسان فراخوانی شود.
 * @param {number} totalGradeBudget - کل بودجه‌ای که برای تخصیص به گریدها در نظر گرفته شده است.
 */
function calculateAndAllocateGradeBudget(totalGradeBudget) {
    // ابتدا تعداد کارشناسان در هر گرید را می‌شماریم.
    const gradeCounts = { A: 0, B: 0, C: 0 };
    agents.forEach(agent => {
        if (agent.performance && agent.performance.grade) {
            gradeCounts[agent.performance.grade]++;
        }
    });

    // محاسبه بودجه کلی که به هر "نوع" گرید اختصاص می‌یابد.
    // مثلاً اگر کل بودجه ۱۰ میلیون باشد و گرید A 60% سهم داشته باشد، ۶ میلیون به گرید A اختصاص می‌یابد.
    const budgetPerGradeCategory = {
        A: totalGradeBudget * gradeBudgetDistributionPercentages.A,
        B: totalGradeBudget * gradeBudgetDistributionPercentages.B,
        C: totalGradeBudget * gradeBudgetDistributionPercentages.C,
    };

    // سپس، این بودجه را بین کارشناسان آن گرید تقسیم می‌کنیم.
    agents.forEach(agent => {
        const grade = agent.performance.grade;
        let allocatedAmount = 0;
        if (gradeCounts[grade] > 0) {
            // بودجه تخصیص یافته به آن گرید / تعداد کارشناسان در آن گرید
            allocatedAmount = budgetPerGradeCategory[grade] / gradeCounts[grade];
        }
        // اینجا هم گرد کردن رو حذف می‌کنیم و اجازه میدیم اعشار باقی بمونه
        agent.performance.allocatedGradeBudget = allocatedAmount;
    });
}


/**
 * تابع جدید: بودجه تخصیص یافته بر اساس نسبت فعالیت مفید را محاسبه می‌کند.
 * @param {number} totalBudgetForUsefulActivity - کل بودجه‌ای که قرار است تخصیص یابد.
 * @param {number} agentUsefulTime - ساعات فعالیت مفید کارشناس مورد نظر.
 * @param {number} totalTeamUsefulTime - مجموع ساعات فعالیت مفید کل تیم.
 * @returns {number} مقدار بودجه تخصیص یافته به کارشناس.
 */
function allocateBudgetByUsefulActivity(totalBudgetForUsefulActivity, agentUsefulTime, totalTeamUsefulTime) {
    if (totalTeamUsefulTime <= 0) { // جلوگیری از تقسیم بر صفر یا مقادیر منفی
        return 0;
    }
    // محاسبه نسبت ساعات فعالیت مفید کارشناس به کل ساعات فعالیت مفید تیم.
    // این مقدار شامل اعشار خواهد بود.
    const ratio = agentUsefulTime / totalTeamUsefulTime;
    return totalBudgetForUsefulActivity * ratio;
}


/* ========= DOM helpers (توابع کمکی برای دستکاری رابط کاربری) ========= */

/** پر کردن دراپ‌داون انتخاب کارشناس با لیست کارشناسان فعلی. */
function populateAgentSelect() {
    const agentSelect = document.getElementById("agentSelect");
    agentSelect.innerHTML = '<option value="">-- یک کارشناس را انتخاب کنید --</option>'; // گزینه پیش‌فرض

    // مرتب‌سازی کارشناسان بر اساس نام و اضافه کردن به دراپ‌داون
    [...agents]
    .sort((a, b) => a.name.localeCompare(b.name, "fa", {
        sensitivity: "base"
    }))
    .forEach((agent) => {
        const option = document.createElement("option");
        option.value = agent.id;
        option.textContent = agent.name;
        agentSelect.appendChild(option);
    });
}

/**
 * تابع برای حذف یک کارشناس از لیست و بروزرسانی LocalStorage و UI.
 * @param {string} agentId - ID کارشناس مورد نظر برای حذف.
 */
function deleteAgent(agentId) {
    if (confirm("آیا مطمئن هستید که می‌خواهید این کارشناس را حذف کنید؟")) {
        agents = agents.filter(agent => agent.id !== agentId);
        saveAgentsToLocalStorage(); // ذخیره تغییرات پس از حذف
        populateAgentSelect(); // بروزرسانی دراپ‌داون
        // پس از حذف، ممکن است بودجه‌های کل تغییر کنند، بنابراین بهتر است باز محاسبه شوند.
        recalculateAllBudgetsAndUI();
        alert("کارشناس با موفقیت حذف شد.");
    }
}

/** بروزرسانی جدول نمایش گریدینگ کارشناسان. */
function updateGradingTable() {
    const gradingTableBody = document.getElementById("gradingTableBody");
    gradingTableBody.innerHTML = ""; // پاک کردن محتوای قبلی جدول

    // ترتیب گریدها برای مرتب‌سازی
    const gradeOrder = {
        A: 1,
        B: 2,
        C: 3
    };

    // مرتب‌سازی کارشناسان: ابتدا بر اساس گرید، سپس امتیاز نهایی، و در نهایت نام.
    [...agents]
    .sort((a, b) => {
        // مرتب‌سازی بر اساس گرید
        if (gradeOrder[a.performance.grade] !== gradeOrder[b.performance.grade]) {
            return gradeOrder[a.performance.grade] - gradeOrder[b.performance.grade];
        }
        // مرتب‌سازی بر اساس امتیاز نهایی (از بالاتر به پایین‌تر)
        if (b.performance.score !== a.performance.score) {
            return b.performance.score - a.performance.score;
        }
        // مرتب‌سازی بر اساس نام (برای موارد مساوی)
        return a.name.localeCompare(b.name, "fa", {
            sensitivity: "base"
        });
    })
    .forEach((agent) => {
        const row = gradingTableBody.insertRow();
        row.insertCell().textContent = agent.name;
        row.insertCell().textContent = agent.isIdentityVerifier ? "بله" : "خیر";
        row.insertCell().textContent = agent.performance.chatCount;
        row.insertCell().textContent = agent.performance.incomingCallCount;
        row.insertCell().textContent = agent.performance.outgoingCallCount;
        row.insertCell().textContent = agent.performance.agentTalkTimeHours.toFixed(2);
        row.insertCell().textContent = agent.performance.identityVerificationCount;
        row.insertCell().textContent = agent.performance.totalUsefulActivityTime.toFixed(2);
        row.insertCell().textContent = agent.performance.score.toFixed(2); // نمایش امتیاز نهایی (که همان خام است)
        const gradeCell = row.insertCell();
        gradeCell.textContent = agent.performance.grade;
        gradeCell.classList.add(`grade-${agent.performance.grade}`); // اضافه کردن کلاس CSS برای رنگ‌بندی

        // نمایش بودجه گرید (از قبل موجود) - با اعشار
        const budgetGradeCell = row.insertCell();
        budgetGradeCell.textContent = agent.performance.allocatedGradeBudget ? agent.performance.allocatedGradeBudget.toFixed(2).toLocaleString() + ' T' : 'N/A';

        // نمایش بودجه فعالیت مفید (جدید) - با اعشار
        const usefulActivityBudgetCell = row.insertCell();
        usefulActivityBudgetCell.textContent = agent.performance.allocatedUsefulActivityBudget ? agent.performance.allocatedUsefulActivityBudget.toFixed(2).toLocaleString() + ' T' : 'N/A';


        // اضافه کردن سلول برای دکمه حذف
        const deleteCell = row.insertCell();
        const deleteButton = document.createElement("button");
        deleteButton.innerHTML = "🗑️"; // علامت سطل آشغال
        deleteButton.classList.add("delete-button"); // اضافه کردن کلاس برای استایل
        deleteButton.title = "حذف کارشناس";
        deleteButton.onclick = () => deleteAgent(agent.id); // اتصال تابع حذف به کلیک دکمه
        deleteCell.appendChild(deleteButton);
    });
}

// متغیر سراسری برای نگهداری نمونه نمودار Chart.js
let gradeChartInstance = null;

/**
 * تابع برای رسم یا بروزرسانی نمودار دایره‌ای توزیع گریدها.
 */
function renderGradePieChart() {
    const gradeCounts = { A: 0, B: 0, C: 0 };
    agents.forEach(agent => {
        if (agent.performance && agent.performance.grade) {
            gradeCounts[agent.performance.grade]++;
        }
    });

    const totalAgents = agents.length;
    const gradePercentages = {
        A: totalAgents > 0 ? ((gradeCounts.A / totalAgents) * 100).toFixed(1) : 0,
        B: totalAgents > 0 ? ((gradeCounts.B / totalAgents) * 100).toFixed(1) : 0,
        C: totalAgents > 0 ? ((gradeCounts.C / totalAgents) * 100).toFixed(1) : 0,
    };

    const ctx = document.getElementById('gradePieChart').getContext('2d');

    // اگر نمودار قبلا وجود دارد، آن را نابود کن تا دوباره رسم شود
    if (gradeChartInstance) {
        gradeChartInstance.destroy();
    }

    gradeChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['گرید A', 'گرید B', 'گرید C'],
            datasets: [{
                data: [gradeCounts.A, gradeCounts.B, gradeCounts.C],
                backgroundColor: [
                    '#2ecc71', // سبز (برای A)
                    '#f1c40f', // زرد (برای B)
                    '#e74c3c'  // قرمز (برای C)
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // برای کنترل بهتر اندازه نمودار در کانتینر
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            family: 'Vazirmatn', // استفاده از فونت Vazirmatn در Legend
                            size: 14
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'توزیع کارشناسان بر اساس گرید',
                    font: {
                        family: 'Vazirmatn',
                        size: 18,
                        weight: 'bold'
                    },
                    color: '#2c3e50'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed + ' کارشناس (' + (context.parsed / totalAgents * 100).toFixed(1) + '%)';
                            }
                            return label;
                        }
                    },
                    bodyFont: {
                        family: 'Vazirmatn',
                        size: 14
                    },
                    titleFont: {
                        family: 'Vazirmatn',
                        size: 16
                    }
                }
            }
        }
    });

    // نمایش خلاصه متنی
    const chartSummaryElement = document.getElementById('chartSummary');
    if (totalAgents === 0) {
        chartSummaryElement.textContent = "هیچ کارشناسی برای نمایش در نمودار وجود ندارد.";
    } else {
        chartSummaryElement.innerHTML = `
            تعداد کل کارشناسان: ${totalAgents} <br>
            گرید A: ${gradeCounts.A} نفر (${gradePercentages.A}%) <br>
            گرید B: ${gradeCounts.B} نفر (${gradePercentages.B}%) <br>
            گرید C: ${gradeCounts.C} نفر (${gradePercentages.C}%)
        `;
    }
}


/* ========= روال‌های فرم (توابع مدیریت تعاملات کاربری) ========= */

/** ثبت کارشناس جدید در سیستم. */
function registerAgent() {
    const agentNameInput = document.getElementById("agentName");
    const registerIsIdentityVerifierCheckbox = document.getElementById("registerIsIdentityVerifier");
    const name = agentNameInput.value.trim();
    const isIdVerifier = registerIsIdentityVerifierCheckbox.checked;

    if (!name) {
        alert("لطفاً نام کارشناس را وارد کنید.");
        return;
    }
    if (agents.some((agent) => agent.name === name)) {
        alert(`کارشناس با نام "${name}" قبلاً ثبت شده است.`);
        return;
    }

    agents.push({
        id: Date.now().toString(), // یک ID یکتا بر اساس زمان
        name,
        isIdentityVerifier: isIdVerifier,
        performance: {
            // مقادیر اولیه عملکرد
            chatCount: 0,
            incomingCallCount: 0,
            outgoingCallCount: 0,
            identityVerificationCount: 0,
            agentTalkTimeHours: 0,
            totalUsefulActivityTime: 0,
            score: 0, // اینجا همان امتیاز خام را ذخیره می کنیم
            grade: "C",
            shift: "morning",
            allocatedGradeBudget: 0, // مقدار اولیه برای بودجه گرید
            allocatedUsefulActivityBudget: 0 // مقدار اولیه برای بودجه فعالیت مفید
        },
    });

    saveAgentsToLocalStorage(); // ذخیره تغییرات
    populateAgentSelect(); // بروزرسانی دراپ‌داون
    updateGradingTable(); // بروزرسانی جدول
    renderGradePieChart(); // بروزرسانی نمودار پس از ثبت کارشناس جدید
    agentNameInput.value = ""; // پاک کردن فیلد ورودی
    registerIsIdentityVerifierCheckbox.checked = false;
    alert(`کارشناس "${name}" با موفقیت ثبت شد.`);
}

/** محاسبه و ذخیره گرید و بودجه برای کارشناس انتخاب شده. */
function calculateAndSaveGrade() {
    const selectedAgentId = document.getElementById("agentSelect").value;
    if (!selectedAgentId) {
        alert("لطفاً یک کارشناس را انتخاب کنید.");
        return;
    }
    const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);
    if (!selectedAgent) {
        alert("کارشناس یافت نشد."); // نباید رخ دهد اگر populateAgentSelect درست کار کند
        return;
    }

    // گرفتن مقادیر عملکرد کارشناس انتخابی از رابط کاربری
    const chatCount = +document.getElementById("chatCount").value || 0;
    const incomingCallCount = +document.getElementById("incomingCallCount").value || 0;
    const outgoingCallCount = +document.getElementById("outgoingCallCount").value || 0;
    const agentTalkTimeHours = +document.getElementById("agentTalkTimeHours").value || 0;
    const identityVerificationCount = +document.getElementById("identityVerificationCount").value || 0;
    const shiftType = document.getElementById("shiftType").value;

    // گرفتن مقادیر ورودی سراسری (تیم) از رابط کاربری
    const totalChatsAcrossAllAgents = +document.getElementById("totalChatsAcrossAllAgents").value || 0;
    const averageChatDurationPerTeamMonth = +document.getElementById("averageChatDurationPerAgent").value || 0;
    const averageIdentityVerificationDurationMinutes = +document.getElementById("averageIdentityVerificationDurationMinutes").value || 0;

    // محاسبه امتیاز
    const calculationResults = calculateGradingScore(
        chatCount,
        incomingCallCount,
        outgoingCallCount,
        identityVerificationCount,
        agentTalkTimeHours,
        selectedAgent.isIdentityVerifier,
        shiftType,
        totalChatsAcrossAllAgents,
        averageChatDurationPerTeamMonth,
        averageIdentityVerificationDurationMinutes
    );

    // به‌روزرسانی شیء performance کارشناس در آرایه اصلی `agents`
    selectedAgent.performance = {
        ...selectedAgent.performance, // حفظ مقادیر قبلی
        chatCount,
        incomingCallCount,
        outgoingCallCount,
        identityVerificationCount,
        agentTalkTimeHours,
        totalUsefulActivityTime: calculationResults.totalUsefulActivityTime,
        score: calculationResults.score,
        grade: assignGrade(calculationResults.score),
        shift: shiftType,
    };

    // پس از محاسبه گرید برای کارشناس، باید بودجه گرید را برای *همه* کارشناسان دوباره محاسبه کنیم
    // زیرا تعداد کارشناسان در هر گرید ممکن است تغییر کرده باشد.
    const totalBudget = +document.getElementById("totalBudget").value || 0;
    calculateAndAllocateGradeBudget(totalBudget); // فراخوانی تابع جدید برای تخصیص بودجه گرید

    saveAgentsToLocalStorage(); // ذخیره تغییرات

    // نمایش نتیجه در رابط کاربری
    document.getElementById("calculationResult").textContent =
        `امتیاز نهایی: ${selectedAgent.performance.score.toFixed(2)} | ` +
        `گرید: ${selectedAgent.performance.grade} | ` +
        `زمان مفید: ${selectedAgent.performance.totalUsefulActivityTime.toFixed(2)}h از ${AVERAGE_MONTHLY_USABLE_HOURS.toFixed(2)}h | ` +
        `بودجه گرید: ${selectedAgent.performance.allocatedGradeBudget.toFixed(2).toLocaleString()} تومان`;

    updateGradingTable(); // بروزرسانی جدول گریدینگ
    renderGradePieChart(); // بروزرسانی نمودار پس از محاسبه گرید

    // پاک کردن فیلدهای ورودی پس از محاسبه
    document.getElementById("chatCount").value = "0";
    document.getElementById("incomingCallCount").value = "0";
    document.getElementById("outgoingCallCount").value = "0";
    document.getElementById("agentTalkTimeHours").value = "0";
    document.getElementById("identityVerificationCount").value = "0";
    document.getElementById("shiftType").value = "morning";
    document.getElementById("agentSelect").value = ''; // پاک کردن انتخاب دراپ‌داون
}


/**
 * تابع جدید: محاسبه و ذخیره بودجه بر اساس فعالیت مفید برای همه کارشناسان.
 * این تابع به ازای کل بودجه وارد شده، آن را بر اساس نسبت فعالیت مفید بین کارشناسان تقسیم می‌کند و مجموع را فیکس می‌کند.
 */
function calculateAndSaveUsefulActivityBudget() {
    const totalBudgetForUsefulActivity = +document.getElementById("totalBudgetForUsefulActivity").value || 0;

    if (totalBudgetForUsefulActivity <= 0) {
        alert("لطفاً یک بودجه مثبت برای تخصیص بر اساس فعالیت مفید وارد کنید.");
        agents.forEach(agent => {
            if (agent.performance) agent.performance.allocatedUsefulActivityBudget = 0;
        });
        saveAgentsToLocalStorage();
        updateGradingTable();
        document.getElementById("usefulActivityBudgetResult").textContent = "بودجه فعالیت مفید تعیین نشد.";
        return;
    }

    // گام ۱: مجموع کل ساعات فعالیت مفید همه کارشناسان را محاسبه کنید.
    let totalTeamUsefulActivityTime = 0;
    agents.forEach(agent => {
        if (agent.performance && typeof agent.performance.totalUsefulActivityTime === 'number' && agent.performance.totalUsefulActivityTime > 0) {
            totalTeamUsefulActivityTime += agent.performance.totalUsefulActivityTime;
        }
    });

    if (totalTeamUsefulActivityTime <= 0) {
        alert("هیچ ساعت فعالیت مفیدی برای تخصیص بودجه یافت نشد. لطفاً ابتدا گرید کارشناسان را محاسبه کنید تا ساعات فعالیت مفید آنها ثبت شود.");
        agents.forEach(agent => {
            if (agent.performance) agent.performance.allocatedUsefulActivityBudget = 0;
        });
        saveAgentsToLocalStorage();
        updateGradingTable();
        document.getElementById("usefulActivityBudgetResult").textContent = "هیچ فعالیت مفیدی برای تخصیص بودجه وجود ندارد.";
        return;
    }

    // گام ۲: بودجه اولیه را برای هر کارشناس بدون گرد کردن محاسبه و ذخیره کنید.
    agents.forEach(agent => {
        const agentUsefulTime = agent.performance?.totalUsefulActivityTime || 0;
        // تخصیص بدون گرد کردن
        const allocated = allocateBudgetByUsefulActivity(totalBudgetForUsefulActivity, agentUsefulTime, totalTeamUsefulActivityTime);
        agent.performance.allocatedUsefulActivityBudget = allocated;
    });

    // گام ۳: مجموع دقیق بودجه‌های تخصیص‌یافته را محاسبه کنید.
    let currentSumAllocated = agents.reduce((sum, agent) => sum + (agent.performance?.allocatedUsefulActivityBudget || 0), 0);

    // گام ۴: تفاوت را پیدا کنید.
    let difference = totalBudgetForUsefulActivity - currentSumAllocated;

    // گام ۵: تفاوت را (اگر خیلی ناچیز بود) به اولین کارشناس با ساعت مفید قابل تخصیص اضافه کنید
    // این کار برای رفع خطاهای کوچک ممیز شناور (floating point errors) هست که ممکن هست باعث بشه مجموع دقیقاً برابر نشه.
    // معمولاً این تفاوت خیلی ناچیز خواهد بود (مثلاً 0.0000000001).
    if (Math.abs(difference) > 0.0001) { // اگر تفاوت قابل توجه بود (بیشتر از یک مقدار ناچیز)
        // این حالت نباید رخ بده اگر محاسبات دقیق باشند.
        console.warn(`هشدار: تفاوت قابل توجه در بودجه فعالیت مفید: ${difference.toFixed(2)}.`);
        // برای اطمینان از فیکس شدن، میتونیم تفاوت رو به کارشناس اول اضافه کنیم
        const firstAgentWithUsefulTime = agents.find(agent => agent.performance && agent.performance.totalUsefulActivityTime > 0);
        if (firstAgentWithUsefulTime) {
            firstAgentWithUsefulTime.performance.allocatedUsefulActivityBudget += difference;
        }
    }


    saveAgentsToLocalStorage(); // ذخیره تغییرات
    updateGradingTable(); // بروزرسانی جدول برای نمایش بودجه جدید

    // نمایش جمع بودجه تخصیص یافته (برای بررسی دقیق)
    const finalSumAllocatedUsefulBudget = agents.reduce((sum, agent) => sum + (agent.performance?.allocatedUsefulActivityBudget || 0), 0);
    document.getElementById("usefulActivityBudgetResult").textContent =
        `بودجه ${totalBudgetForUsefulActivity.toLocaleString()} تومان بر اساس فعالیت مفید بین کارشناسان تخصیص یافت. مجموع تخصیص یافته نهایی: ${finalSumAllocatedUsefulBudget.toFixed(2).toLocaleString()} تومان. جزئیات در جدول گریدینگ قابل مشاهده است.`;
}

/**
 * تابع کمکی برای باز محاسبه تمامی بودجه‌ها و به روز رسانی UI.
 * در مواردی مانند حذف کارشناس که ممکن است مجموع‌ها تغییر کنند، فراخوانی می‌شود.
 */
function recalculateAllBudgetsAndUI() {
    const totalBudget = +document.getElementById("totalBudget").value || 0;
    const totalBudgetForUsefulActivity = +document.getElementById("totalBudgetForUsefulActivity").value || 0;

    // گریدها باید قبل از بودجه‌های مرتبط با گرید محاسبه شوند
    // (گرچه در این سناریو فرض می‌کنیم گرید هر کارشناس قبلاً تنظیم شده است)
    // اینجا فقط بودجه‌های گرید را بر اساس آخرین وضعیت گریدها دوباره محاسبه می‌کنیم.
    calculateAndAllocateGradeBudget(totalBudget);
    calculateAndSaveUsefulActivityBudget(); // این تابع خود شامل جمع کل و تخصیص است

    saveAgentsToLocalStorage();
    updateGradingTable();
    renderGradePieChart();
}


/* ========= رویدادها ========= */
document.getElementById("registerAgentButton").addEventListener("click", registerAgent);
document.getElementById("calculateGradeButton").addEventListener("click", calculateAndSaveGrade);
document.getElementById("calculateUsefulActivityBudgetButton").addEventListener("click", calculateAndSaveUsefulActivityBudget);

// مدیریت رویداد تغییر دراپ‌داون انتخاب کارشناس: بارگذاری اطلاعات کارشناس
document.getElementById('agentSelect').addEventListener('change', function() {
    const selectedAgentId = this.value;
    const chatCountInput = document.getElementById('chatCount');
    const shiftTypeDropdown = document.getElementById('shiftType');
    const incomingCallCountInput = document.getElementById('incomingCallCount');
    const outgoingCallCountInput = document.getElementById('outgoingCallCount');
    const agentTalkTimeHoursInput = document.getElementById('agentTalkTimeHours');
    const identityVerificationCountInput = document.getElementById('identityVerificationCount');

    if (selectedAgentId) {
        const selectedAgent = agents.find(agent => agent.id === selectedAgentId);
        if (selectedAgent) {
            // غیرفعال کردن فیلد چت اگر کارشناس احراز هویت کننده باشد
            if (selectedAgent.isIdentityVerifier) {
                chatCountInput.disabled = true;
                chatCountInput.value = '0';
                chatCountInput.style.backgroundColor = '#e9e9e9';
                chatCountInput.style.cursor = 'not-allowed';
            } else {
                chatCountInput.disabled = false;
                chatCountInput.style.backgroundColor = '#fff';
                chatCountInput.style.cursor = 'text';
            }

            // بارگذاری مقادیر عملکرد ذخیره شده کارشناس در فیلدهای ورودی
            chatCountInput.value = selectedAgent.performance.chatCount;
            incomingCallCountInput.value = selectedAgent.performance.incomingCallCount;
            outgoingCallCountInput.value = selectedAgent.performance.outgoingCallCount;
            agentTalkTimeHoursInput.value = selectedAgent.performance.agentTalkTimeHours;
            identityVerificationCountInput.value = selectedAgent.performance.identityVerificationCount;
            shiftTypeDropdown.value = selectedAgent.performance.shift || 'morning';

            document.getElementById('calculationResult').textContent = '';
        }
    } else {
        // بازگرداندن فیلدها به حالت پیش‌فرض اگر کارشناسی انتخاب نشده باشد
        chatCountInput.disabled = false;
        chatCountInput.style.backgroundColor = '#fff';
        chatCountInput.style.cursor = 'text';

        // پاک کردن مقادیر فیلدها
        chatCountInput.value = '0';
        incomingCallCountInput.value = '0';
        outgoingCallCountInput.value = '0';
        agentTalkTimeHoursInput.value = '0';
        identityVerificationCountInput.value = '0';
        shiftTypeDropdown.value = 'morning';
        document.getElementById('calculationResult').textContent = '';
    }
});

// اجرای توابع هنگام بارگذاری کامل صفحه
document.addEventListener("DOMContentLoaded", () => {
    loadAgentsFromLocalStorage(); // بارگذاری داده‌ها از LocalStorage
    populateAgentSelect();
    updateGradingTable();
    renderGradePieChart();
});
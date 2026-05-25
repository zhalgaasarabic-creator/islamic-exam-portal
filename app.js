/* ==========================================================================
   Ислами Емтихан Порталы - Application Logic (app.js)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // 1. STATE & USER SESSION MANAGEMENT
  let activeTab = "dashboard-view";
  let darkTheme = false;
  
  // Authentication State
  let currentUser = null;
  let currentGroup = null;
  let userRole = null; // 'student' or 'teacher'
  
  // Quiz State
  let quizQuestions = [];
  let currentQuizIndex = 0;
  let quizScore = 0;
  let selectedOptionIndex = null;
  let quizTimerInterval = null;
  let timeLeft = 0;
  let quizTimeLimit = 60; 
  let quizSelectedAnswers = []; 
  
  // Dynamic Questions State loaded from Node API
  let examQuestions = [];
  let selectedCourse = "2-курс ұлдар";
  let selectedBook = "all";

  // Generated Exam State
  let generatedExamQuestions = [];

  // ==========================================================================
  // 2. DOM ELEMENTS
  // ==========================================================================
  
  // Auth Elements
  const loginScreen = document.getElementById("login-screen");
  const passcodeModal = document.getElementById("passcode-modal");
  const appContainer = document.getElementById("app-container");
  const studentNameInput = document.getElementById("student-name");
  const studentGroupInput = document.getElementById("student-group");
  const studentLoginBtn = document.getElementById("student-login-btn");
  const showTeacherLoginBtn = document.getElementById("show-teacher-login-btn");
  const teacherPasscodeInput = document.getElementById("teacher-passcode-input");
  const passcodeError = document.getElementById("passcode-error");
  const closePasscodeModalBtn = document.getElementById("close-passcode-modal-btn");
  const submitPasscodeBtn = document.getElementById("submit-passcode-btn");
  
  // Sidebar Navigation
  const sidebar = document.getElementById("sidebar");
  const menuItems = document.querySelectorAll(".menu-item");
  const mobileToggle = document.getElementById("mobile-toggle");
  const profileAvatar = document.querySelector(".user-avatar");
  const profileName = document.querySelector(".user-details h4");
  const profileGroup = document.querySelector(".user-details p");
  const navBooks = document.getElementById("nav-books");
  const navTeacher = document.getElementById("nav-teacher");
  const studyButtons = document.querySelectorAll(".start-study-btn");
  
  // Theme Toggle & Top Header
  const themeToggle = document.getElementById("theme-toggle");
  const dateDisplay = document.getElementById("date-display");
  const globalSearchInput = document.getElementById("global-search-input");
  
  // View Sections
  const viewSections = document.querySelectorAll(".view-section");
  
  // Books Explore View
  const questionsListContainer = document.getElementById("questions-list");
  // bookFilter element removed
  const toggleAllAnswersBtn = document.getElementById("toggle-all-answers-btn");
  const searchResultCount = document.getElementById("search-result-count");
  let showAllAnswersState = false;

  // Interactive Quiz View
  const quizSetupPanel = document.getElementById("quiz-setup-panel");
  const quizPlayPanel = document.getElementById("quiz-play-panel");
  const quizResultPanel = document.getElementById("quiz-result-panel");
  const quizActiveBookTitle = document.getElementById("quiz-active-book-title");
  const quizQProgress = document.getElementById("quiz-q-progress");
  const quizTimer = document.getElementById("quiz-timer");
  const quizProgressBar = document.getElementById("quiz-progress-bar");
  const quizQuestionTopic = document.getElementById("quiz-question-topic");
  const quizQuestionText = document.getElementById("quiz-question-text");
  const quizOptionsContainer = document.getElementById("quiz-options-container");
  
  // Quiz Buttons
  const startQuizNowBtn = document.getElementById("start-quiz-now-btn");
  const quitQuizBtn = document.getElementById("quit-quiz-btn");
  const nextQuestionBtn = document.getElementById("next-question-btn");
  const retryQuizBtn = document.getElementById("retry-quiz-btn");
  const viewWrongAnswersBtn = document.getElementById("view-wrong-answers-btn");
  const quizReviewContainer = document.getElementById("quiz-review-container");
  const reviewList = document.getElementById("review-list");
  
  // Quiz Results DOM
  const resultPercent = document.getElementById("result-percent");
  const resultFraction = document.getElementById("result-fraction");
  const resultTitle = document.getElementById("result-title");
  const resultSubtitle = document.getElementById("result-subtitle");
  const resultTotalQ = document.getElementById("result-total-q");
  const resultCorrectQ = document.getElementById("result-correct-q");
  const resultWrongQ = document.getElementById("result-wrong-q");
  const resultScoreCircle = document.getElementById("result-score-circle");
  const resultStatsRow = document.getElementById("result-stats-row");
  const studentFinishBtn = document.getElementById("student-finish-btn");

  // Flashcards elements removed

  // Teacher Console & Generator
  // teachBook variables removed for dynamic checkboxes
  const questionsPerBook = document.getElementById("questions-per-book");
  const teachIncludeKey = document.getElementById("teach-include-key");
  const teachRandomOrder = document.getElementById("teach-random-order");
  const generateExamSheetBtn = document.getElementById("generate-exam-sheet-btn");
  const printExamBtn = document.getElementById("print-exam-btn");
  const examSheetPreview = document.getElementById("exam-sheet-preview");
  const printPaperContainer = document.getElementById("print-paper-container");
  
  // Student Results Table DOM
  const studentResultsTbody = document.getElementById("student-results-tbody");
  const refreshResultsBtn = document.getElementById("refresh-results-btn");
  const clearAllResultsBtn = document.getElementById("clear-all-results-btn");

  // Reset all quiz states, views, and selections
  const resetQuizState = () => {
    clearInterval(quizTimerInterval);
    quizQuestions = [];
    currentQuizIndex = 0;
    quizScore = 0;
    selectedOptionIndex = null;
    timeLeft = 0;
    quizSelectedAnswers = [];
    
    // Toggle active views/panels in Quiz view back to setup panel
    if (quizSetupPanel) quizSetupPanel.classList.remove("hidden");
    if (quizPlayPanel) quizPlayPanel.classList.add("hidden");
    if (quizResultPanel) quizResultPanel.classList.add("hidden");
    if (quizReviewContainer) quizReviewContainer.classList.add("hidden");
    
    // Clear dynamic list rendering
    if (reviewList) reviewList.innerHTML = "";
    if (globalSearchInput) globalSearchInput.value = "";
    selectedBook = "all";
    
    // Clear completed books from session storage on logout
    sessionStorage.removeItem("completed_books");
  };

  // ==========================================================================
  // 3. AUTHENTICATION & LOGIN LOGIC
  // ==========================================================================
  
  // Set User Session
  const setUserSession = (name, group, role) => {
    resetQuizState();
    
    currentUser = name;
    currentGroup = group;
    userRole = role;
    
    const sessionData = { name, group, role };
    sessionStorage.setItem("exam_user", JSON.stringify(sessionData));
    
    // Update Profile UI in Sidebar
    profileName.textContent = name;
    profileGroup.textContent = group;
    profileAvatar.textContent = name.substring(0, 1).toUpperCase();
    
    if (role === "teacher") {
      profileAvatar.style.backgroundColor = "var(--color-gold)";
      profileAvatar.textContent = "Ұ";
    } else {
      profileAvatar.style.backgroundColor = "var(--color-emerald)";
    }

    // Update Sidebar Brand Course dynamically
    const brandCourse = document.getElementById("sidebar-brand-course");
    if (brandCourse) {
      if (role === "teacher") {
        brandCourse.textContent = "Басқару кабинеті";
      } else {
        brandCourse.textContent = group + " тобы";
      }
    }

    // Sidebar access control for students (hidden from student sidebar)
    if (role === "student") {
      navBooks.style.display = "none";
      navTeacher.style.display = "none";
      studyButtons.forEach(btn => btn.style.display = "none");
    } else {
      navBooks.style.display = "flex";
      navTeacher.style.display = "flex";
      studyButtons.forEach(btn => btn.style.display = "inline-flex");
    }

    // Quiz Parameters Control for Students (exactly 40 questions, no time limit)
    const quizParamsRow = document.getElementById("quiz-params-row");
    const quizQCountInput = document.getElementById("quiz-question-count");
    const quizTimeInput = document.getElementById("quiz-time-limit");
    
    if (role === "student") {
      if (quizParamsRow) quizParamsRow.style.display = "none";
      if (quizQCountInput) quizQCountInput.value = "40";
      if (quizTimeInput) quizTimeInput.value = "0";
    } else {
      if (quizParamsRow) quizParamsRow.style.display = "flex";
      if (quizQCountInput && quizQCountInput.value === "40" && quizTimeInput && quizTimeInput.value === "0") {
        quizQCountInput.value = "30";
        quizTimeInput.value = "60";
      }
    }
  };

  // Check Existing Session on Load
  const checkUserSession = () => {
    const sessionData = sessionStorage.getItem("exam_user");
    if (sessionData) {
      try {
        const user = JSON.parse(sessionData);
        setUserSession(user.name, user.group, user.role);
        
        loginScreen.classList.add("hidden");
        appContainer.classList.remove("hidden");
        switchTab("dashboard-view");
      } catch (e) {
        console.error("Error parsing session:", e);
        sessionStorage.removeItem("exam_user");
      }
    }
  };

  // Student Login Button Click
  studentLoginBtn.addEventListener("click", () => {
    const name = studentNameInput.value.trim();
    const group = studentGroupInput.value;
    
    if (name === "") {
      alert("Өтінеміз, аты-жөніңізді толық жазыңыз!");
      return;
    }
    
    setUserSession(name, group, "student");
    
    // Animate transition
    loginScreen.style.opacity = 0;
    setTimeout(() => {
      loginScreen.classList.add("hidden");
      loginScreen.style.opacity = 1;
      appContainer.classList.remove("hidden");
      switchTab("dashboard-view");
    }, 300);
  });

  // Open Passcode Modal for Teacher Login
  showTeacherLoginBtn.addEventListener("click", () => {
    passcodeError.classList.add("hidden");
    teacherPasscodeInput.value = "";
    passcodeModal.classList.remove("hidden");
  });

  // Close Passcode Modal
  closePasscodeModalBtn.addEventListener("click", () => {
    passcodeModal.classList.add("hidden");
  });

  // Submit Passcode Handler
  const verifyPasscode = () => {
    const passcode = teacherPasscodeInput.value.trim();
    if (passcode === "2002" || passcode === "admin") {
      setUserSession("Ұстаз", "Басқарушы", "teacher");
      passcodeModal.classList.add("hidden");
      loginScreen.classList.add("hidden");
      appContainer.classList.remove("hidden");
      
      // Auto redirect to Teacher Console
      switchTab("teacher-view");
    } else {
      passcodeError.classList.remove("hidden");
      teacherPasscodeInput.value = "";
    }
  };

  submitPasscodeBtn.addEventListener("click", verifyPasscode);
  teacherPasscodeInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      verifyPasscode();
    }
  });

  // Logout Handler
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("Жүйеден шыққыңыз келе ме?")) {
        resetQuizState();
        
        // Clear session storage
        sessionStorage.removeItem("exam_user");
        currentUser = null;
        currentGroup = null;
        userRole = null;
        
        // Reset login form inputs
        studentNameInput.value = "";
        studentGroupInput.selectedIndex = 0;
        
        // Hide app screen and show login screen
        appContainer.classList.add("hidden");
        loginScreen.classList.remove("hidden");
        
        // Animate login screen entry
        loginScreen.style.opacity = 0;
        setTimeout(() => {
          loginScreen.style.opacity = 1;
        }, 50);
      }
    });
  }

  // ==========================================================================
  // 4. NAVIGATION & TAB SWITCHING
  // ==========================================================================
  
  // Set Current Date in Kazakh
  const updateCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const months = [
      "қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым",
      "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"
    ];
    const month = months[today.getMonth()];
    const day = today.getDate();
    dateDisplay.innerHTML = `<i class="fa-regular fa-calendar-days"></i> ${year} жыл, ${day} ${month}`;
  };
  updateCurrentDate();

  // Switch Tab Handler
  const switchTab = (targetViewId) => {
    // Hide all views
    viewSections.forEach(view => view.classList.remove("active"));
    
    // Show target view
    const targetView = document.getElementById(targetViewId);
    if (targetView) {
      targetView.classList.add("active");
      activeTab = targetViewId;
    }
    
    // Update active nav menu item
    menuItems.forEach(item => {
      if (item.getAttribute("data-target") === targetViewId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Specific triggers
    if (targetViewId === "books-view") {
      renderQuestionsList();
    } else if (targetViewId === "teacher-view") {
      renderTeacherBookCheckboxes();
      loadStudentResults();
    } else if (targetViewId === "quiz-view") {
      renderQuizBookOptions();
    } else if (targetViewId === "dashboard-view") {
      renderDashboard();
    }

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Close mobile sidebar
    if (window.innerWidth <= 1024) {
      sidebar.classList.remove("active");
    }
  };

  // Navigation Items Clicks
  menuItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const target = item.getAttribute("data-target");
      
      // If student clicks Teacher Console, verify passcode first!
      if (target === "teacher-view" && userRole !== "teacher") {
        passcodeError.classList.add("hidden");
        teacherPasscodeInput.value = "";
        passcodeModal.classList.remove("hidden");
        
        // Temporarily redefine passcode action for active navigation
        const originalVerify = verifyPasscode;
        const navVerify = () => {
          const passcode = teacherPasscodeInput.value.trim();
          if (passcode === "2002" || passcode === "admin") {
            // Upgrade role for session
            setUserSession("Ұстаз", "Басқарушы", "teacher");
            passcodeModal.classList.add("hidden");
            switchTab("teacher-view");
            
            // Restore original passcode handler
            submitPasscodeBtn.onclick = originalVerify;
          } else {
            passcodeError.classList.remove("hidden");
            teacherPasscodeInput.value = "";
          }
        };
        
        submitPasscodeBtn.onclick = navVerify;
        teacherPasscodeInput.onkeypress = (ev) => {
          if (ev.key === "Enter") navVerify();
        };
      } else {
        switchTab(target);
      }
    });
  });

  // Mobile Toggle Sidebar
  mobileToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  // Theme Toggle (Dark Mode)
  themeToggle.addEventListener("click", () => {
    darkTheme = !darkTheme;
    if (darkTheme) {
      document.body.classList.add("dark-theme");
      themeToggle.innerHTML = `<i class="fa-solid fa-sun"></i>`;
    } else {
      document.body.classList.remove("dark-theme");
      themeToggle.innerHTML = `<i class="fa-solid fa-moon"></i>`;
    }
  });

  // Dashboard quick links via event delegation to support dynamic rendering
  document.addEventListener("click", (e) => {
    const studyBtn = e.target.closest(".start-study-btn");
    if (studyBtn) {
      const book = studyBtn.getAttribute("data-book");
      if (userRole === "teacher") {
        selectedBook = book;
        renderQuestionsList();
        switchTab("books-view");
      }
    }

    const quizBtn = e.target.closest(".start-quiz-btn");
    if (quizBtn) {
      const book = quizBtn.getAttribute("data-book");
      switchTab("quiz-view");
      setTimeout(() => {
        const input = document.querySelector(`input[name='quiz-book'][value='${book}']`);
        if (input) {
          input.checked = true;
          const grid = document.querySelector("#quiz-view .radio-cards-grid");
          if (grid) {
            grid.querySelectorAll(".radio-card").forEach(c => c.classList.remove("selected"));
          }
          input.closest(".radio-card").classList.add("selected");
        }
      }, 50);
    }
  });

  // ===========================================
  const renderQuestionsList = () => {
    const searchQuery = globalSearchInput.value.toLowerCase().trim();
    
    questionsListContainer.innerHTML = "";
    
    // Render dynamic book tabs
    renderBookTabs();
    
    // Update indicator row
    updateActivePath();

    let filteredQuestions = examQuestions.filter(q => {
      const matchesCourse = selectedCourse === "1-курс қыздар" ? q.course === "1-курс қыздар" : q.course !== "1-курс қыздар";
      const matchesBook = selectedBook === "all" || q.book === selectedBook;
      const matchesSearch = searchQuery === "" || 
                            q.question.toLowerCase().includes(searchQuery) ||
                            q.topic.toLowerCase().includes(searchQuery) ||
                            q.explanation.toLowerCase().includes(searchQuery) ||
                            q.options.some(opt => opt.toLowerCase().includes(searchQuery));
      return matchesCourse && matchesBook && matchesSearch;
    });

    searchResultCount.textContent = `Табылған сұрақтар саны: ${filteredQuestions.length}`;

    if (filteredQuestions.length === 0) {
      questionsListContainer.innerHTML = `
        <div class="empty-preview-state">
          <i class="fa-solid fa-circle-info"></i>
          <p>Іздеу талабы бойынша ешқандай сұрақ табылдады.</p>
        </div>
      `;
      return;
    }

    filteredQuestions.forEach((q, idx) => {
      const qCard = document.createElement("div");
      qCard.className = "question-item";
      const bookNames = {
        "izhar": "Изһар кітабы",
        "quduri": "Қудури кітабы",
        "tahawi": "Тахауи ақидасы",
        "sarf_izzi": "Сарф Иззи",
        "miat_amil": "Шарх Миәти Амил",
        "nahw_tatbiqi": "Нахву Татбиқи",
        "tahawi_text": "Тахауи ақидасы (Мәтін)",
        "nur_al_idah": "Нұр әл-Идах"
      };
      const bookClasses = {
        "izhar": "tag-izhar",
        "quduri": "tag-quduri",
        "tahawi": "tag-tahawi",
        "sarf_izzi": "tag-izhar",
        "miat_amil": "tag-quduri",
        "nahw_tatbiqi": "tag-tahawi",
        "tahawi_text": "tag-tahawi",
        "nur_al_idah": "tag-quduri"
      };
      const bookLabel = bookNames[q.book] || "Аралас";
      const bookClass = bookClasses[q.book] || "tag-tahawi";

      qCard.innerHTML = `
        <div class="q-item-header">
          <div class="q-badge-row">
            <span class="book-tag ${bookClass}">${bookLabel}</span>
            <span class="q-topic">Тақырыбы: ${q.topic}</span>
          </div>
          <span class="q-number" style="display: inline-flex; align-items: center; gap: 8px;">
            ${userRole === 'teacher' ? `
            <button class="q-edit-trigger" data-id="${q.id}">
              <i class="fa-solid fa-pen-to-square"></i> Өзгерту
            </button>
            ` : ''}
            Сұрақ #${idx + 1} (ID: ${q.id})
          </span>
        </div>
        <h3 class="q-question-text">${q.question}</h3>
        <div class="q-options-grid">
          <div class="q-option-line ${q.correctAnswer === 0 ? 'correct' : ''}">
            <span class="q-option-prefix">А)</span>
            <span class="q-option-text">${q.options[0]}</span>
          </div>
          <div class="q-option-line ${q.correctAnswer === 1 ? 'correct' : ''}">
            <span class="q-option-prefix">Б)</span>
            <span class="q-option-text">${q.options[1]}</span>
          </div>
          <div class="q-option-line ${q.correctAnswer === 2 ? 'correct' : ''}">
            <span class="q-option-prefix">В)</span>
            <span class="q-option-text">${q.options[2]}</span>
          </div>
          <div class="q-option-line ${q.correctAnswer === 3 ? 'correct' : ''}">
            <span class="q-option-prefix">Г)</span>
            <span class="q-option-text">${q.options[3]}</span>
          </div>
        </div>
        <button class="q-explanation-trigger" data-id="${q.id}">
          <i class="fa-solid fa-circle-info"></i> Түсіндірмесін көру
        </button>
        <div class="q-explanation-box" id="exp-box-${q.id}">
          <strong>Шариғи/Грамматикалық талдау:</strong>
          <p>${q.explanation}</p>
          <span class="ref"><i class="fa-solid fa-bookmark"></i> Сілтеме: ${q.reference}</span>
        </div>
      `;

      questionsListContainer.appendChild(qCard);
    });

    // Expand Explanations
    document.querySelectorAll(".q-explanation-trigger").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const box = document.getElementById(`exp-box-${id}`);
        const isActive = box.classList.toggle("active");
        btn.innerHTML = isActive ? 
          `<i class="fa-solid fa-eye-slash"></i> Түсіндірмесін жасыру` : 
          `<i class="fa-solid fa-circle-info"></i> Түсіндірмесін көру`;
      });
    });

    // Bind Edit Triggers
    if (userRole === 'teacher') {
      document.querySelectorAll(".q-edit-trigger").forEach(btn => {
        btn.addEventListener("click", () => {
          const qId = btn.getAttribute("data-id");
          openEditQuestionModal(qId);
        });
      });
    }

    if (showAllAnswersState) {
      document.querySelectorAll(".q-explanation-box").forEach(box => box.classList.add("active"));
      document.querySelectorAll(".q-explanation-trigger").forEach(btn => {
        btn.innerHTML = `<i class="fa-solid fa-eye-slash"></i> Түсіндірмесін жасыру`;
      });
    }
  };

  // Dynamic books catalog by course
  const getBooksForCourse = (course) => {
    if (course === "1-курс қыздар") {
      return [
        { id: "all", title: "Барлық кітаптар", icon: "fa-solid fa-list-check" },
        { id: "sarf_izzi", title: "Сарф Иззи", icon: "fa-solid fa-language" },
        { id: "miat_amil", title: "Шарх Миәти Амил", icon: "fa-solid fa-lines-leaning" },
        { id: "nahw_tatbiqi", title: "Нахву Татбиқи", icon: "fa-solid fa-signature" },
        { id: "tahawi_text", title: "Тахауи ақидасы", icon: "fa-solid fa-kaaba" },
        { id: "nur_al_idah", title: "Нұр әл-Идах", icon: "fa-solid fa-scale-balanced" }
      ];
    } else {
      return [
        { id: "all", title: "Барлық кітаптар", icon: "fa-solid fa-list-check" },
        { id: "izhar", title: "Изһар кітабы", icon: "fa-solid fa-language" },
        { id: "quduri", title: "Қудури кітабы", icon: "fa-solid fa-scale-balanced" },
        { id: "tahawi", title: "Тахауи ақидасы", icon: "fa-solid fa-kaaba" }
      ];
    }
  };

  // Helper to render dashboard dynamically depending on active course/group
  const renderDashboard = () => {
    const statsGrid = document.getElementById("dashboard-stats-grid");
    const booksGrid = document.getElementById("dashboard-books-grid");
    const welcomeDesc = document.getElementById("dashboard-welcome-desc");
    const welcomeBadges = document.getElementById("dashboard-welcome-badges");
    
    if (!statsGrid || !booksGrid) return;
    
    const activeCourse = (userRole === "student") ? currentGroup : selectedCourse;
    const completedBooks = JSON.parse(sessionStorage.getItem("completed_books") || "[]");
    
    // Filter questions by active course
    const courseQuestions = examQuestions.filter(q => {
      if (activeCourse === "1-курс қыздар") {
        return q.course === "1-курс қыздар";
      } else {
        return q.course !== "1-курс қыздар" && q.course !== "1-курс qыздар";
      }
    });

    if (activeCourse === "1-курс қыздар") {
      if (welcomeDesc) {
        welcomeDesc.textContent = "1-курс қыздар тобына арналған классикалық ислами кітаптар бойынша емтихан дайындау және оқу порталына қош келдіңіздер.";
      }
      if (welcomeBadges) {
        welcomeBadges.innerHTML = `
          <span class="badge"><i class="fa-solid fa-circle-check"></i> 200 кәсіби сұрақ</span>
          <span class="badge"><i class="fa-solid fa-print"></i> Баспаға дайын билеттер</span>
          <span class="badge"><i class="fa-solid fa-bolt"></i> Интерактивті тест</span>
        `;
      }

      const sarfCount = courseQuestions.filter(q => q.book === "sarf_izzi").length;
      const miatCount = courseQuestions.filter(q => q.book === "miat_amil").length;
      const nahwCount = courseQuestions.filter(q => q.book === "nahw_tatbiqi").length;
      const tahawiCount = courseQuestions.filter(q => q.book === "tahawi_text").length;
      const nurCount = courseQuestions.filter(q => q.book === "nur_al_idah").length;

      const sarfCompleted = completedBooks.includes("sarf_izzi");
      const miatCompleted = completedBooks.includes("miat_amil");
      const nahwCompleted = completedBooks.includes("nahw_tatbiqi");
      const tahawiTextCompleted = completedBooks.includes("tahawi_text");
      const nurCompleted = completedBooks.includes("nur_al_idah");

      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon icon-izhar">
            <i class="fa-solid fa-language"></i>
          </div>
          <div class="stat-info">
            <h3>Сарф Иззи</h3>
            <p class="stat-val">${sarfCount} сұрақ</p>
            <p class="stat-desc">Араб сөзжасамы (Сарф)</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-quduri" style="background-color: var(--color-emerald-light); color: var(--color-emerald);">
            <i class="fa-solid fa-lines-leaning"></i>
          </div>
          <div class="stat-info">
            <h3>Миәти Амил</h3>
            <p class="stat-val">${miatCount} сұрақ</p>
            <p class="stat-desc">Араб синтаксисі (Нәху)</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-tahawi" style="background-color: rgba(212, 175, 55, 0.1); color: var(--color-gold);">
            <i class="fa-solid fa-signature"></i>
          </div>
          <div class="stat-info">
            <h3>Нахву Татбиқи</h3>
            <p class="stat-val">${nahwCount} сұрақ</p>
            <p class="stat-desc">Қолданбалы Нәху ережелері</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-tahawi">
            <i class="fa-solid fa-kaaba"></i>
          </div>
          <div class="stat-info">
            <h3>Тахауи ақидасы</h3>
            <p class="stat-val">${tahawiCount} сұрақ</p>
            <p class="stat-desc">Ханафи сенім мәтіні</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-quduri">
            <i class="fa-solid fa-scale-balanced"></i>
          </div>
          <div class="stat-info">
            <h3>Нұр әл-Идах</h3>
            <p class="stat-val">${nurCount} сұрақ</p>
            <p class="stat-desc">Ғибадат үкімдері (Фиқһ)</p>
          </div>
        </div>
      `;

      booksGrid.innerHTML = `
        <div class="book-card card-izhar">
          <div class="book-card-header">
            <span class="book-tag tag-izhar">Сарф</span>
            <h3>Сарф Иззи ${sarfCompleted ? '<i class="fa-solid fa-circle-check" style="color: var(--accent-success); font-size: 18px; margin-left: 8px;" title="Тапсырылды"></i>' : ''}</h3>
            <p class="author">Имам әл-Иззи</p>
          </div>
          <div class="book-card-body">
            <p>Араб сөзжасамының (Морфология) негізгі ережелері мен маңызды сөз түрлендіру қағидалары (толық кітап).</p>
            <div class="topics-covered">
              <span>Сұласи & Рубағи</span>
              <span>Сахих & Муғталл</span>
              <span>Масдар & Тасриф</span>
            </div>
          </div>
          <div class="book-card-footer">
            <button class="btn btn-outline start-study-btn" data-book="sarf_izzi"><i class="fa-solid fa-book"></i> Оқу</button>
            <button class="btn btn-primary start-quiz-btn" data-book="sarf_izzi"><i class="fa-solid fa-play"></i> Тест</button>
          </div>
        </div>

        <div class="book-card card-quduri" style="border-top: 4px solid var(--color-emerald);">
          <div class="book-card-header">
            <span class="book-tag tag-quduri" style="background-color: var(--color-emerald-light); color: var(--color-emerald);">Нәху</span>
            <h3>Шарх Миәти Амил ${miatCompleted ? '<i class="fa-solid fa-circle-check" style="color: var(--accent-success); font-size: 18px; margin-left: 8px;" title="Тапсырылды"></i>' : ''}</h3>
            <p class="author">Имам Абдулқаһир әл-Джурджани</p>
          </div>
          <div class="book-card-body">
            <p>Араб синтаксисіндегі жүз әмилді (ықпал етуші факторларды) баяндайтын еңбек (11-нші нәуътен соңына дейін).</p>
            <div class="topics-covered">
              <span>11-нші нәуътен бастап</span>
              <span>Мәнәуи әмилдер</span>
              <span>Тәуәбиғтар жүйесі</span>
            </div>
          </div>
          <div class="book-card-footer">
            <button class="btn btn-outline start-study-btn" data-book="miat_amil"><i class="fa-solid fa-book"></i> Оқу</button>
            <button class="btn btn-primary start-quiz-btn" data-book="miat_amil"><i class="fa-solid fa-play"></i> Тест</button>
          </div>
        </div>

        <div class="book-card card-tahawi" style="border-top: 4px solid var(--color-gold);">
          <div class="book-card-header">
            <span class="book-tag tag-tahawi" style="background-color: rgba(212, 175, 55, 0.1); color: var(--color-gold);">Нәху</span>
            <h3>Нахву Татбиқи ${nahwCompleted ? '<i class="fa-solid fa-circle-check" style="color: var(--accent-success); font-size: 18px; margin-left: 8px;" title="Тапсырылды"></i>' : ''}</h3>
            <p class="author">Шейх Халид Әл-Азһари / Қазіргі заман оқулығы</p>
          </div>
          <div class="book-card-body">
            <p>Араб синтаксисінің практикалық әрі қолданбалы ережелері мен жаттығулары (басынан Мамнуъ минассарфқа дейін).</p>
            <div class="topics-covered">
              <span>Иғраб негіздері</span>
              <span>Марфуғаттар жүйесі</span>
              <span>Мамнуъ минассарфқа дейін</span>
            </div>
          </div>
          <div class="book-card-footer">
            <button class="btn btn-outline start-study-btn" data-book="nahw_tatbiqi"><i class="fa-solid fa-book"></i> Оқу</button>
            <button class="btn btn-primary start-quiz-btn" data-book="nahw_tatbiqi"><i class="fa-solid fa-play"></i> Тест</button>
          </div>
        </div>

        <div class="book-card card-tahawi">
          <div class="book-card-header">
            <span class="book-tag tag-tahawi">Ақида</span>
            <h3>Тахауи ақидасы ${tahawiTextCompleted ? '<i class="fa-solid fa-circle-check" style="color: var(--accent-success); font-size: 18px; margin-left: 8px;" title="Тапсырылды"></i>' : ''}</h3>
            <p class="author">Имам Абу Джафар әт-Тахауи</p>
          </div>
          <div class="book-card-body">
            <p>Әһлі сүннет уәл-жамағаттың сенім жүйесін толық әрі ықшам баяндаған мәшһүр сенім мәтіні (толық мәтін).</p>
            <div class="topics-covered">
              <span>Таухид негіздері</span>
              <span>Пайғамбарлық & Иман</span>
              <span>Ақырет & Сахабалар</span>
            </div>
          </div>
          <div class="book-card-footer">
            <button class="btn btn-outline start-study-btn" data-book="tahawi_text"><i class="fa-solid fa-book"></i> Оқу</button>
            <button class="btn btn-primary start-quiz-btn" data-book="tahawi_text"><i class="fa-solid fa-play"></i> Тест</button>
          </div>
        </div>

        <div class="book-card card-quduri">
          <div class="book-card-header">
            <span class="book-tag tag-quduri">Фиқһ</span>
            <h3>Нұр әл-Идах ${nurCompleted ? '<i class="fa-solid fa-circle-check" style="color: var(--accent-success); font-size: 18px; margin-left: 8px;" title="Тапсырылды"></i>' : ''}</h3>
            <p class="author">Имам әш-Шурунбуләли</p>
          </div>
          <div class="book-card-body">
            <p>Ханафи мәзһабы бойынша ғибадат үкімдері (Хайыз және Нифас үкімдерінен бастап, имамның сәлемнен кейінгі істеріне дейін).</p>
            <div class="topics-covered">
              <span>Хайыз & Нифас үкімдері</span>
              <span>Намаз шарттары & Имамат</span>
              <span>Имамның сәлемнен кейінгі сүннеттері</span>
            </div>
          </div>
          <div class="book-card-footer">
            <button class="btn btn-outline start-study-btn" data-book="nur_al_idah"><i class="fa-solid fa-book"></i> Оқу</button>
            <button class="btn btn-primary start-quiz-btn" data-book="nur_al_idah"><i class="fa-solid fa-play"></i> Тест</button>
          </div>
        </div>
      `;
    } else {
      if (welcomeDesc) {
        welcomeDesc.textContent = "2-курс ұлдар тобына арналған классикалық ислами кітаптар бойынша емтихан дайындау және оқу порталына қош келдіңіздер.";
      }
      if (welcomeBadges) {
        welcomeBadges.innerHTML = `
          <span class="badge"><i class="fa-solid fa-circle-check"></i> 120 кәсіби сұрақ</span>
          <span class="badge"><i class="fa-solid fa-print"></i> Баспаға дайын билеттер</span>
          <span class="badge"><i class="fa-solid fa-bolt"></i> Интерактивті тест</span>
        `;
      }

      const izharCount = courseQuestions.filter(q => q.book === "izhar").length;
      const quduriCount = courseQuestions.filter(q => q.book === "quduri").length;
      const tahawiCount = courseQuestions.filter(q => q.book === "tahawi").length;

      const izharCompleted = completedBooks.includes("izhar");
      const quduriCompleted = completedBooks.includes("quduri");
      const tahawiCompleted = completedBooks.includes("tahawi");

      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon icon-izhar">
            <i class="fa-solid fa-language"></i>
          </div>
          <div class="stat-info">
            <h3>Изһар кітабы</h3>
            <p class="stat-val">${izharCount} сұрақ</p>
            <p class="stat-desc">Араб тілі синтаксисі (Нәху)</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon icon-quduri">
            <i class="fa-solid fa-scale-balanced"></i>
          </div>
          <div class="stat-info">
            <h3>Қудури кітабы</h3>
            <p class="stat-val">${quduriCount} сұрақ</p>
            <p class="stat-desc">Қажылықтан Неке/Талаққа дейін</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon icon-tahawi">
            <i class="fa-solid fa-kaaba"></i>
          </div>
          <div class="stat-info">
            <h3>Тахауи (Ғазнауи)</h3>
            <p class="stat-val">${tahawiCount} сұрақ</p>
            <p class="stat-desc">Ханафи сенім негіздері (Ақида)</p>
          </div>
        </div>
      `;

      booksGrid.innerHTML = `
        <div class="book-card card-izhar">
          <div class="book-card-header">
            <span class="book-tag tag-izhar">Нәху</span>
            <h3>Изһар ал-Асрар ${izharCompleted ? '<i class="fa-solid fa-circle-check" style="color: var(--accent-success); font-size: 18px; margin-left: 8px;" title="Тапсырылды"></i>' : ''}</h3>
            <p class="author">Имам әл-Биргиви</p>
          </div>
          <div class="book-card-body">
            <p>Араб тілінің грамматикасын, сөздердің сөйлемдегі септелу ережелерін (Әмил, Мәъмул, Иғраб) оқытатын классикалық еңбек.</p>
            <div class="topics-covered">
              <span>Әмил ләфзи & мәнәуи</span>
              <span>Марфуғат & Мансубат</span>
              <span>Тәбиғ сөздер</span>
            </div>
          </div>
          <div class="book-card-footer">
            <button class="btn btn-outline start-study-btn" data-book="izhar"><i class="fa-solid fa-book"></i> Оқу</button>
            <button class="btn btn-primary start-quiz-btn" data-book="izhar"><i class="fa-solid fa-play"></i> Тест</button>
          </div>
        </div>
        
        <div class="book-card card-quduri">
          <div class="book-card-header">
            <span class="book-tag tag-quduri">Фиқһ</span>
            <h3>Мухтасар әл-Қудури ${quduriCompleted ? '<i class="fa-solid fa-circle-check" style="color: var(--accent-success); font-size: 18px; margin-left: 8px;" title="Тапсырылды"></i>' : ''}</h3>
            <p class="author">Имам әл-Қудури</p>
          </div>
          <div class="book-card-body">
            <p>Ханафи мәзһабының негізгі заңдары. Бұл бөлімде Қажылық парыздары мен отбасылық қатынастар (Неке, Талақ, Иддәт) қамтылған.</p>
            <div class="topics-covered">
              <span>Қажылық & Миқаттар</span>
              <span>Неке шарттары & Мәһр</span>
              <span>Талақ түрлері & Иддәт</span>
            </div>
          </div>
          <div class="book-card-footer">
            <button class="btn btn-outline start-study-btn" data-book="quduri"><i class="fa-solid fa-book"></i> Оқу</button>
            <button class="btn btn-primary start-quiz-btn" data-book="quduri"><i class="fa-solid fa-play"></i> Тест</button>
          </div>
        </div>
        
        <div class="book-card card-tahawi">
          <div class="book-card-header">
            <span class="book-tag tag-tahawi">Ақида</span>
            <h3>Тахауи (Ғазнауи шархы) ${tahawiCompleted ? '<i class="fa-solid fa-circle-check" style="color: var(--accent-success); font-size: 18px; margin-left: 8px;" title="Тапсырылды"></i>' : ''}</h3>
            <p class="author">Имам әт-Тахауи / Имам әл-Ғазнауи</p>
          </div>
          <div class="book-card-body">
            <p>Әһлі сүннет уәл-жамағаттың бұлжымас сенім негіздері. Аллаһтың сипаттары, тағдыр, ақырет және сахабалар ережелері.</p>
            <div class="topics-covered">
              <span>Таухид & Сипаттар</span>
              <span>Тағдыр & Ләухул-Махфуз</span>
              <span>Иман & Сахабалар әдебі</span>
            </div>
          </div>
          <div class="book-card-footer">
            <button class="btn btn-outline start-study-btn" data-book="tahawi"><i class="fa-solid fa-book"></i> Оқу</button>
            <button class="btn btn-primary start-quiz-btn" data-book="tahawi"><i class="fa-solid fa-play"></i> Тест</button>
          </div>
        </div>
      `;
    }

    if (userRole === "student") {
      document.querySelectorAll(".start-study-btn").forEach(btn => btn.style.display = "none");
    } else {
      document.querySelectorAll(".start-study-btn").forEach(btn => btn.style.display = "inline-flex");
    }
  };

  // Helper to render capsule tabs for Books Selector
  const renderBookTabs = () => {
    const bookTabsList = document.getElementById("book-tabs-list");
    if (!bookTabsList) return;

    // Filter questions by active course
    const courseQuestions = examQuestions.filter(q => {
      if (selectedCourse === "1-курс қыздар") {
        return q.course === "1-курс қыздар";
      } else {
        return q.course !== "1-курс qыздар" && q.course !== "1-курс қыздар";
      }
    });

    const booksData = getBooksForCourse(selectedCourse);

    bookTabsList.innerHTML = "";
    booksData.forEach(b => {
      // Calculate count of questions for this specific book
      const count = b.id === "all" ? courseQuestions.length : courseQuestions.filter(q => q.book === b.id).length;

      const tab = document.createElement("div");
      tab.className = `book-tab-item ${selectedBook === b.id ? 'active' : ''}`;
      tab.innerHTML = `
        <i class="${b.icon}"></i>
        <span>${b.title}</span>
        <span class="tab-badge">${count}</span>
      `;
      tab.addEventListener("click", () => {
        selectedBook = b.id;
        renderQuestionsList();
      });
      bookTabsList.appendChild(tab);
    });
  };

  // Helper to render teacher checkboxes for dynamic ticket generation
  const renderTeacherBookCheckboxes = () => {
    const container = document.getElementById("teach-book-checkboxes");
    if (!container) return;

    let books = [];
    if (selectedCourse === "1-курс қыздар") {
      books = [
        { id: "sarf_izzi", title: "Сарф Иззи кітабы" },
        { id: "miat_amil", title: "Шарх Миәти Амил" },
        { id: "nahw_tatbiqi", title: "Нахву Татбиқи" },
        { id: "tahawi_text", title: "Тахауи ақидасы (Мәтін)" },
        { id: "nur_al_idah", title: "Нұр әл-Идах (Фиқһ)" }
      ];
    } else {
      books = [
        { id: "izhar", title: "Изһар кітабы (Нәху)" },
        { id: "quduri", title: "Қудури кітабы (Фиқһ)" },
        { id: "tahawi", title: "Тахауи ақидасы (Ақида)" }
      ];
    }

    container.innerHTML = "";
    books.forEach(b => {
      const label = document.createElement("label");
      label.className = "custom-checkbox";
      label.innerHTML = `
        <input type="checkbox" id="teach-book-${b.id}" checked>
        <span>${b.title}</span>
      `;
      container.appendChild(label);
    });
  };

  // Helper to render Quiz selector books dynamically
  const renderQuizBookOptions = () => {
    const grid = document.querySelector("#quiz-view .radio-cards-grid");
    if (!grid) return;

    const activeCourse = (userRole === "student") ? currentGroup : selectedCourse;
    
    let books = [];
    if (activeCourse === "1-курс қыздар") {
      books = [
        { id: "mix", title: "Аралас емтихан", icon: "fa-solid fa-shuffle", desc: "Бес кітаптан теңдей сұрақтар жиналады" },
        { id: "sarf_izzi", title: "Сарф Иззи", icon: "fa-solid fa-language", desc: "Араб сөзжасамы (Сарф ережелері)" },
        { id: "miat_amil", title: "Шарх Миәти Амил", icon: "fa-solid fa-lines-leaning", desc: "11-нші нәуътен кітаптың соңына дейін" },
        { id: "nahw_tatbiqi", title: "Нахву Татбиқи", icon: "fa-solid fa-signature", desc: "Кітап басынан Мамнуъ минассарфқа дейін" },
        { id: "tahawi_text", title: "Тахауи ақидасы", icon: "fa-solid fa-kaaba", desc: "Әһлі Сүннет сенім негізі (Мәтін)" },
        { id: "nur_al_idah", title: "Нұр әл-Идах", icon: "fa-solid fa-scale-balanced", desc: "Фиқһ: Хаиздан имамның сәлеміне дейін" }
      ];
    } else {
      books = [
        { id: "mix", title: "Аралас емтихан", icon: "fa-solid fa-shuffle", desc: "Үш кітаптан теңдей сұрақтар жиналады" },
        { id: "izhar", title: "Изһар кітабы", icon: "fa-solid fa-language", desc: "Араб синтаксисі (Нәху ережелері)" },
        { id: "quduri", title: "Қудури кітабы", icon: "fa-solid fa-scale-balanced", desc: "Қажылық, Неке және Талақ үкімдері" },
        { id: "tahawi", title: "Тахауи ақидасы", icon: "fa-solid fa-kaaba", desc: "Ғазнауи шархы негізінде" }
      ];
    }

    grid.innerHTML = "";
    const completedBooks = JSON.parse(sessionStorage.getItem("completed_books") || "[]");
    
    books.forEach((b, idx) => {
      const isCompleted = completedBooks.includes(b.id);
      const label = document.createElement("label");
      label.className = `radio-card ${idx === 0 ? 'selected' : ''}`;
      label.innerHTML = `
        <input type="radio" name="quiz-book" value="${b.id}" ${idx === 0 ? 'checked' : ''}>
        <div class="radio-card-content">
          <span class="card-icon"><i class="${b.icon}"></i></span>
          <h4>${b.title} ${isCompleted ? '<i class="fa-solid fa-circle-check" style="color: var(--accent-success); margin-left: 8px;" title="Тапсырылды"></i>' : ''}</h4>
          <p>${b.desc}</p>
        </div>
      `;
      
      label.addEventListener("click", () => {
        grid.querySelectorAll(".radio-card").forEach(c => c.classList.remove("selected"));
        label.classList.add("selected");
      });
      
      grid.appendChild(label);
    });
  };

  // Helper to update active path indicator text
  const updateActivePath = () => {
    const pathIndicator = document.getElementById("active-path-indicator");
    if (!pathIndicator) return;
    const courseTitle = selectedCourse === "1-курс қыздар" ? "1-курс қыздар тобы" : selectedCourse === "2-курс ұлдар" ? "2-курс ұлдар тобы" : "2-курс сырттай бөлім";
    
    let bookTitle = "Барлық кітаптар";
    if (selectedBook !== "all") {
      const booksData = getBooksForCourse(selectedCourse);
      const matched = booksData.find(b => b.id === selectedBook);
      if (matched) bookTitle = matched.title;
    }
    
    pathIndicator.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${courseTitle} &gt; <span style="color: var(--color-gold); font-weight: 700;">${bookTitle}</span>`;
  };

  // Bind Course selector grid clicks (one-time)
  document.querySelectorAll("#course-selector-grid .course-card").forEach(card => {
    card.addEventListener("click", () => {
      document.querySelectorAll("#course-selector-grid .course-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      selectedCourse = card.getAttribute("data-course");
      selectedBook = "all";
      renderTeacherBookCheckboxes(); // Update ticket checkboxes!
      renderDashboard(); // Update dashboard cards!
      renderQuestionsList();
    });
  });

  globalSearchInput.addEventListener("input", () => {
    if (activeTab !== "books-view") {
      switchTab("books-view");
    }
    renderQuestionsList();
  });

  toggleAllAnswersBtn.addEventListener("click", () => {
    showAllAnswersState = !showAllAnswersState;
    if (showAllAnswersState) {
      toggleAllAnswersBtn.innerHTML = `<i class="fa-solid fa-eye-slash"></i> Жауаптарын жасыру`;
      document.querySelectorAll(".q-explanation-box").forEach(box => box.classList.add("active"));
      document.querySelectorAll(".q-explanation-trigger").forEach(btn => {
        btn.innerHTML = `<i class="fa-solid fa-eye-slash"></i> Түсіндірмесін жасыру`;
      });
    } else {
      toggleAllAnswersBtn.innerHTML = `<i class="fa-solid fa-eye"></i> Жауаптарын көрсету`;
      document.querySelectorAll(".q-explanation-box").forEach(box => box.classList.remove("active"));
      document.querySelectorAll(".q-explanation-trigger").forEach(btn => {
        btn.innerHTML = `<i class="fa-solid fa-circle-info"></i> Түсіндірмесін көру`;
      });
    }
  });

  // ==========================================================================
  // 6. INTERACTIVE QUIZ ENGINE & API INTEGRATION
  // ==========================================================================
  
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  // Start Quiz setup
  const startQuiz = () => {
    const quizBookSelect = document.querySelector("input[name='quiz-book']:checked").value;
    const countLimit = parseInt(document.getElementById("quiz-question-count").value);
    quizTimeLimit = parseInt(document.getElementById("quiz-time-limit").value);
    
    const activeCourse = (userRole === "student") ? currentGroup : selectedCourse;
    
    // Filter questions by course
    const courseQuestions = examQuestions.filter(q => {
      if (activeCourse === "1-курс қыздар") {
        return q.course === "1-курс қыздар";
      } else {
        return q.course !== "1-курс қыздар" && q.course !== "1-курс қыздар";
      }
    });

    let availableQuestions = [];
    if (quizBookSelect === "mix") {
      availableQuestions = [...courseQuestions];
    } else {
      availableQuestions = courseQuestions.filter(q => q.book === quizBookSelect);
    }

    if (availableQuestions.length === 0) {
      alert("Бұл кітап бойынша сұрақтар табылмады.");
      return;
    }

    const shuffled = shuffleArray([...availableQuestions]);
    quizQuestions = shuffled.slice(0, Math.min(countLimit, shuffled.length)).map(q => {
      const qCopy = { ...q, options: [...q.options] };
      const correctOptionText = qCopy.options[qCopy.correctAnswer];
      qCopy.options = shuffleArray([...qCopy.options]);
      qCopy.correctAnswer = qCopy.options.indexOf(correctOptionText);
      return qCopy;
    });

    // Reset parameters
    currentQuizIndex = 0;
    quizScore = 0;
    quizSelectedAnswers = [];
    
    quizSetupPanel.classList.add("hidden");
    quizPlayPanel.classList.remove("hidden");
    quizResultPanel.classList.add("hidden");

    loadQuizQuestion();
  };

  startQuizNowBtn.addEventListener("click", startQuiz);

  const loadQuizQuestion = () => {
    if (currentQuizIndex >= quizQuestions.length) {
      endQuiz();
      return;
    }

    clearInterval(quizTimerInterval);
    selectedOptionIndex = null;
    nextQuestionBtn.disabled = true;
    nextQuestionBtn.innerHTML = `Келесі сұрақ <i class="fa-solid fa-arrow-right"></i>`;

    const q = quizQuestions[currentQuizIndex];
    
    quizQProgress.textContent = `Сұрақ: ${currentQuizIndex + 1} / ${quizQuestions.length}`;
    quizProgressBar.style.width = `${((currentQuizIndex + 1) / quizQuestions.length) * 100}%`;
    
    const bookTitle = q.book === "izhar" ? "Изһар (Наху)" : q.book === "quduri" ? "Қудури (Фиқһ)" : "Тахауи (Ақида)";
    quizActiveBookTitle.textContent = bookTitle;
    quizQuestionTopic.textContent = `Тақырыбы: ${q.topic}`;
    quizQuestionText.textContent = q.question;

    quizOptionsContainer.innerHTML = "";
    q.options.forEach((opt, idx) => {
      const optBtn = document.createElement("button");
      optBtn.className = "quiz-option-btn";
      const prefix = ["А", "Б", "В", "Г"][idx];
      optBtn.innerHTML = `
        <span class="quiz-opt-pref">${prefix})</span>
        <span class="quiz-opt-text">${opt}</span>
      `;
      optBtn.addEventListener("click", () => handleQuizSelection(idx));
      quizOptionsContainer.appendChild(optBtn);
    });

    if (quizTimeLimit > 0) {
      timeLeft = quizTimeLimit;
      quizTimer.classList.remove("danger");
      quizTimer.textContent = formatTime(timeLeft);
      
      quizTimerInterval = setInterval(() => {
        timeLeft--;
        quizTimer.textContent = formatTime(timeLeft);
        
        if (timeLeft <= 10) {
          quizTimer.classList.add("danger");
        }
        
        if (timeLeft <= 0) {
          clearInterval(quizTimerInterval);
          autoSubmitQuizAnswer();
        }
      }, 1000);
    } else {
      quizTimer.textContent = "Шектеусіз";
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleQuizSelection = (index) => {
    if (selectedOptionIndex !== null) return;
    
    clearInterval(quizTimerInterval);
    selectedOptionIndex = index;
    nextQuestionBtn.disabled = false;

    const q = quizQuestions[currentQuizIndex];
    const optionButtons = quizOptionsContainer.querySelectorAll(".quiz-option-btn");

    quizSelectedAnswers.push(index);

    optionButtons.forEach((btn, idx) => {
      btn.disabled = true;
      if (userRole === "student") {
        // Strict exam mode: only highlight the selected choice in a beautiful neutral color
        if (idx === index) {
          btn.classList.add("selected-choice");
        }
      } else {
        // Teacher/testing mode: show correct (green) and wrong (red) answers instantly
        if (idx === q.correctAnswer) {
          btn.classList.add("correct-choice");
        }
        if (idx === index && index !== q.correctAnswer) {
          btn.classList.add("wrong-choice");
        }
      }
    });

    if (index === q.correctAnswer) {
      quizScore++;
    }

    if (currentQuizIndex === quizQuestions.length - 1) {
      nextQuestionBtn.innerHTML = `Қорытындыны көру <i class="fa-solid fa-square-poll-vertical"></i>`;
    }
  };

  const autoSubmitQuizAnswer = () => {
    handleQuizSelection(-1);
  };

  nextQuestionBtn.addEventListener("click", () => {
    currentQuizIndex++;
    loadQuizQuestion();
  });

  quitQuizBtn.addEventListener("click", () => {
    if (confirm("Шынымен сынақты аяқтамай шығып кеткіңіз келе ме?")) {
      clearInterval(quizTimerInterval);
      quizPlayPanel.classList.add("hidden");
      quizSetupPanel.classList.remove("hidden");
    }
  });

  // End Quiz, Submit Results & Display
  const endQuiz = () => {
    clearInterval(quizTimerInterval);
    quizPlayPanel.classList.add("hidden");
    quizResultPanel.classList.remove("hidden");

    // Save completed book in sessionStorage
    const bookType = quizQuestions[0] ? quizQuestions[0].book : "mix";
    let completedBooks = JSON.parse(sessionStorage.getItem("completed_books") || "[]");
    if (!completedBooks.includes(bookType)) {
      completedBooks.push(bookType);
      sessionStorage.setItem("completed_books", JSON.stringify(completedBooks));
    }
    renderDashboard(); // Immediately update dashboard with checkmarks!

    const percent = Math.round((quizScore / quizQuestions.length) * 100);
    
    resultPercent.textContent = `${percent}%`;
    resultFraction.textContent = `${quizScore} / ${quizQuestions.length}`;
    resultTotalQ.textContent = quizQuestions.length;
    resultCorrectQ.textContent = quizScore;
    resultWrongQ.textContent = quizQuestions.length - quizScore;

    // Send score to backend automatically if role is student!
    if (userRole === "student") {
      const bookType = quizQuestions[0] ? quizQuestions[0].book : "mix";
      const bookNames = {
        "izhar": "Изһар (Нәху)",
        "quduri": "Қудури (Фиқһ)",
        "tahawi": "Тахауи (Ақида)",
        "sarf_izzi": "Сарф Иззи",
        "miat_amil": "Шарх Миәти Амил",
        "nahw_tatbiqi": "Нахву Татбиқи",
        "tahawi_text": "Тахауи (Мәтін)",
        "nur_al_idah": "Нұр әл-Идах"
      };
      const bookLabel = bookNames[bookType] || "Аралас";
      
      const payload = {
        name: currentUser,
        group: currentGroup,
        book: bookLabel,
        score: quizScore,
        total: quizQuestions.length,
        percent: percent
      };

      fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => {
        console.log("Result saved on server:", data);
      })
      .catch(err => {
        console.error("Error submitting result to server:", err);
      });
    }

    if (userRole === "student") {
      // Hide all score/fraction/stats visuals for students
      resultScoreCircle.classList.add("hidden");
      resultStatsRow.classList.add("hidden");
      retryQuizBtn.classList.add("hidden");
      viewWrongAnswersBtn.classList.add("hidden");
      
      // Show only the exit / finish button
      studentFinishBtn.classList.remove("hidden");
      
      // Clean pedagogical text
      resultTitle.textContent = "Емтихан аяқталды!";
      resultSubtitle.textContent = "МашаАллаһ! Сіз сынақты толық аяқтадыңыз. Жауаптарыңыз тексеру үшін ұстазға сәтті жіберілді. Нәтижеңізді ұстаздан біле аласыз.";
    } else {
      // Show full details for teacher/admin testing
      resultScoreCircle.classList.remove("hidden");
      resultStatsRow.classList.remove("hidden");
      retryQuizBtn.classList.remove("hidden");
      viewWrongAnswersBtn.classList.remove("hidden");
      
      // Hide student finish button
      studentFinishBtn.classList.add("hidden");

      if (percent >= 90) {
        resultTitle.textContent = "МашаАллаһ, Өте үздік!";
        resultSubtitle.textContent = "Сіз емтиханнан сүрінбей өттіңіз. Ислами біліміңіз өте терең.";
        resultScoreCircle.style.borderColor = "var(--accent-success)";
      } else if (percent >= 75) {
        resultTitle.textContent = "Жақсы нәтиже!";
        resultSubtitle.textContent = "Сіз лайықты білім деңгейін көрсеттіңіз. Жаттығуды жалғастырыңыз.";
        resultScoreCircle.style.borderColor = "var(--color-gold)";
      } else if (percent >= 50) {
        resultTitle.textContent = "Қанағаттанарлық!";
        resultSubtitle.textContent = "Сұрақтардың жартысына жуығына дұрыс жауап бердіңіз. Кітаптарды қайта оқып шығуды ұсынамыз.";
        resultScoreCircle.style.borderColor = "var(--accent-warning)";
      } else {
        resultTitle.textContent = "Әлі де іздену керек!";
        resultSubtitle.textContent = "Емтихан нәтижесі төмен. Төмендегі \"Қатемен жұмыс\" бөлімінен қателерді зерттеп шығыңыз.";
        resultScoreCircle.style.borderColor = "var(--accent-danger)";
      }
    }

    quizReviewContainer.classList.add("hidden");
    viewWrongAnswersBtn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Қатемен жұмыс`;
  };

  retryQuizBtn.addEventListener("click", () => {
    quizResultPanel.classList.add("hidden");
    quizSetupPanel.classList.remove("hidden");
  });

  viewWrongAnswersBtn.addEventListener("click", () => {
    const isHidden = quizReviewContainer.classList.toggle("hidden");
    if (isHidden) {
      viewWrongAnswersBtn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Қатемен жұмыс`;
    } else {
      viewWrongAnswersBtn.innerHTML = `<i class="fa-solid fa-eye-slash"></i> Талдауды жасыру`;
      renderQuizReview();
    }
  });

  studentFinishBtn.addEventListener("click", () => {
    resetQuizState();
    
    // Clear session storage
    sessionStorage.removeItem("exam_user");
    currentUser = null;
    currentGroup = null;
    userRole = null;
    
    // Reset login form inputs
    studentNameInput.value = "";
    studentGroupInput.selectedIndex = 0;
    
    // Hide app screen and show login screen
    appContainer.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    
    // Animate login screen entry
    loginScreen.style.opacity = 0;
    setTimeout(() => {
      loginScreen.style.opacity = 1;
    }, 50);
  });

  const renderQuizReview = () => {
    reviewList.innerHTML = "";
    let wrongCount = 0;
    
    quizQuestions.forEach((q, idx) => {
      const userAns = quizSelectedAnswers[idx];
      
      if (userAns !== q.correctAnswer) {
        wrongCount++;
        const reviewItem = document.createElement("div");
        reviewItem.className = "question-item";
        reviewItem.style.borderLeft = "4px solid var(--accent-danger)";

        const chosenLabel = userAns >= 0 ? `Сіздің жауабыңыз: ${["А", "Б", "В", "Г"][userAns]}) ${q.options[userAns]}` : "Жауап берілмеді (уақыт бітті)";
        const correctLabel = `Дұрыс жауап: ${["А", "Б", "В", "Г"][q.correctAnswer]}) ${q.options[q.correctAnswer]}`;

        reviewItem.innerHTML = `
          <div class="q-item-header">
            <span class="book-tag tag-izhar">${q.book === "izhar" ? "Изһар" : q.book === "quduri" ? "Қудури" : "Тахауи"}</span>
            <span class="q-topic">Сұрақ #${idx + 1} | Тақырыбы: ${q.topic}</span>
          </div>
          <h4 class="q-question-text" style="font-size: 15px; margin-bottom: 12px;">${q.question}</h4>
          
          <div style="font-size: 13px; margin-bottom: 10px; color: var(--accent-danger); font-weight: 600;">
            <i class="fa-solid fa-xmark"></i> ${chosenLabel}
          </div>
          <div style="font-size: 13px; margin-bottom: 15px; color: var(--accent-success); font-weight: 600;">
            <i class="fa-solid fa-check"></i> ${correctLabel}
          </div>
          
          <div class="q-explanation-box active" style="margin-top: 0;">
            <strong>Түсіндірме:</strong>
            <p>${q.explanation}</p>
            <span class="ref"><i class="fa-solid fa-bookmark"></i> Дереккөз сілтемесі: ${q.reference}</span>
          </div>
        `;
        reviewList.appendChild(reviewItem);
      }
    });

    if (wrongCount === 0) {
      reviewList.innerHTML = `<p style="text-align: center; color: var(--accent-success); font-weight: 600; padding: 20px;">Керемет! Сіз ешқандай қателік жібермедіңіз!</p>`;
    }
  };

  // ==========================================================================
  // 7. QUESTION EDITOR LOGIC (TEACHER PORTAL ONLY)
  // ==========================================================================
  
  const openEditQuestionModal = (qId) => {
    const q = examQuestions.find(item => item.id.toString() === qId.toString());
    if (!q) return;

    document.getElementById("edit-q-id").value = q.id;
    document.getElementById("edit-q-text").value = q.question;
    document.getElementById("edit-q-opt-a").value = q.options[0];
    document.getElementById("edit-q-opt-b").value = q.options[1];
    document.getElementById("edit-q-opt-c").value = q.options[2];
    document.getElementById("edit-q-opt-d").value = q.options[3];
    document.getElementById("edit-q-correct").value = q.correctAnswer;
    document.getElementById("edit-q-explanation").value = q.explanation;
    document.getElementById("edit-q-topic").value = q.topic;
    document.getElementById("edit-q-reference").value = q.reference;

    document.getElementById("question-edit-modal").classList.remove("hidden");
  };

  document.getElementById("close-edit-modal-btn").addEventListener("click", () => {
    document.getElementById("question-edit-modal").classList.add("hidden");
  });

  document.getElementById("save-edit-question-btn").addEventListener("click", () => {
    const qId = document.getElementById("edit-q-id").value;
    const question = document.getElementById("edit-q-text").value.trim();
    const optA = document.getElementById("edit-q-opt-a").value.trim();
    const optB = document.getElementById("edit-q-opt-b").value.trim();
    const optC = document.getElementById("edit-q-opt-c").value.trim();
    const optD = document.getElementById("edit-q-opt-d").value.trim();
    const correctAnswer = parseInt(document.getElementById("edit-q-correct").value);
    const explanation = document.getElementById("edit-q-explanation").value.trim();
    const topic = document.getElementById("edit-q-topic").value.trim();
    const reference = document.getElementById("edit-q-reference").value.trim();

    if (!question || !optA || !optB || !optC || !optD || !topic) {
      alert("Өтінеміз, барлық міндетті өрістерді толтырыңыз!");
      return;
    }

    const payload = {
      question,
      options: [optA, optB, optC, optD],
      correctAnswer,
      explanation,
      topic,
      reference
    };

    fetch(`/api/questions/${qId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(res => {
      if (!res.ok) throw new Error("Серверде сұрақты жаңарту сәтсіз аяқталды");
      return res.json();
    })
    .then(data => {
      console.log("Question updated successfully:", data);
      
      // Update in local memory
      const index = examQuestions.findIndex(item => item.id.toString() === qId.toString());
      if (index !== -1) {
        examQuestions[index] = { ...examQuestions[index], ...payload };
      }
      
      // Close modal
      document.getElementById("question-edit-modal").classList.add("hidden");
      
      // Re-render questions list
      renderQuestionsList();
    })
    .catch(err => {
      console.error("Error updating question:", err);
      alert("Сұрақты сақтау кезінде қате орын алды: " + err.message);
    });
  });

  // ==========================================================================
  // 8. TEACHER EXAM TICKET GENERATOR
  // ==========================================================================
  
  const generateExamSheet = () => {
    const container = document.getElementById("teach-book-checkboxes");
    const checkedInputs = container.querySelectorAll("input[type='checkbox']:checked");
    const countPerBook = parseInt(questionsPerBook.value);
    const format = document.querySelector("input[name='teach-exam-format']:checked").value;
    const includeKey = teachIncludeKey.checked;
    const randomize = teachRandomOrder.checked;

    if (checkedInputs.length === 0) {
      alert("Ең кемінде бір кітапты таңдауыңыз керек.");
      return;
    }

    // Filter questions by active course
    let courseQuestions = examQuestions.filter(q => {
      if (selectedCourse === "1-курс қыздар") {
        return q.course === "1-курс қыздар";
      } else {
        return q.course !== "1-курс қыздар" && q.course !== "1-курс қыздар";
      }
    });

    let finalQuestions = [];
    
    checkedInputs.forEach(input => {
      const bookId = input.id.replace("teach-book-", "");
      const bookQ = courseQuestions.filter(q => q.book === bookId);
      const shuffled = shuffleArray([...bookQ]);
      const sliced = shuffled.slice(0, countPerBook).map(q => {
        const qCopy = { ...q, options: [...q.options] };
        const correctOptionText = qCopy.options[qCopy.correctAnswer];
        qCopy.options = shuffleArray([...qCopy.options]);
        qCopy.correctAnswer = qCopy.options.indexOf(correctOptionText);
        return qCopy;
      });
      finalQuestions = [...finalQuestions, ...sliced];
    });

    if (randomize) {
      finalQuestions = shuffleArray(finalQuestions);
    }
    
    generatedExamQuestions = finalQuestions;

    renderExamPreview(finalQuestions, format, includeKey);
    renderExamPrint(finalQuestions, format, includeKey);

    printExamBtn.disabled = false;
    printExamBtn.classList.remove("disabled");
  };

  generateExamSheetBtn.addEventListener("click", generateExamSheet);

  const renderExamPreview = (questions, format, includeKey) => {
    examSheetPreview.innerHTML = "";
    
    const examCard = document.createElement("div");
    examCard.className = "generated-exam";
    
    let booksText = [];
    const container = document.getElementById("teach-book-checkboxes");
    const checkedInputs = container.querySelectorAll("input[type='checkbox']:checked");
    checkedInputs.forEach(input => {
      const labelText = input.nextElementSibling.textContent.trim();
      booksText.push(labelText.replace(" кітабы", "").replace(" ақидасы", "").replace(" (Нәху)", "").replace(" (Фиқһ)", "").replace(" (Ақида)", "").replace(" (Мәтін)", ""));
    });
    
    const courseTitle = selectedCourse === "1-курс қыздар" ? "1-курс қыздар тобы" : "2-курс ұлдар тобы";
    
    examCard.innerHTML = `
      <div class="exam-header">
        <h1>Кәсіби Емтихан Парағы</h1>
        <h2>Пәндері: ${booksText.join(", ")}</h2>
        <p style="font-size: 12px; margin-top: 5px;">${courseTitle} бағдарламасы</p>
      </div>
      
      <div class="exam-meta-grid">
        <div class="meta-field"><strong>Шәкірттің аты-жөні:</strong> ________________________</div>
        <div class="meta-field"><strong>Күні:</strong> 2026 жыл, «____» ____________</div>
        <div class="meta-field"><strong>Курсы, тобы:</strong> ${courseTitle}</div>
        <div class="meta-field"><strong>Бағалау / Балл:</strong> ________________________</div>
      </div>
      
      <div class="exam-instructions">
        <strong>Нұсқаулық:</strong> Сұрақтарды мұқият оқып шығыңыз. ${
          format === "with-options" ? 
          "Әр сұрақтың астындағы нұсқалардың ішінен тек бір ғана дұрыс жауапты шеңберлеп белгілеңіз." : 
          "Бұл ашық сұрақтар форматы. Сұрақтардың астындағы бос орындарға толық әрі жүйелі жазбаша жауап жазыңыз."
        } Жұмыс уақыты: 90 минут. Сәттілік тілейміз!
      </div>
      
      <div class="preview-question-list" id="preview-q-list-target">
      </div>
    `;

    examSheetPreview.appendChild(examCard);
    const qListTarget = document.getElementById("preview-q-list-target");

    questions.forEach((q, idx) => {
      const qItem = document.createElement("div");
      qItem.className = "preview-q-item";

      if (format === "with-options") {
        qItem.innerHTML = `
          <div class="preview-q-text">${idx + 1}. ${q.question}</div>
          <div class="preview-q-options">
            <div class="preview-opt-item"><strong>А)</strong> ${q.options[0]}</div>
            <div class="preview-opt-item"><strong>Б)</strong> ${q.options[1]}</div>
            <div class="preview-opt-item"><strong>В)</strong> ${q.options[2]}</div>
            <div class="preview-opt-item"><strong>Г)</strong> ${q.options[3]}</div>
          </div>
        `;
      } else {
        qItem.innerHTML = `
          <div class="preview-q-text">${idx + 1}. ${q.question}</div>
          <div class="preview-q-open-space"></div>
        `;
      }
      qListTarget.appendChild(qItem);
    });

    if (includeKey) {
      const keysSection = document.createElement("div");
      keysSection.className = "preview-keys-section";
      keysSection.innerHTML = `
        <h3>Жауап кілттері (Тек мұғалімдер үшін):</h3>
        <div class="preview-keys-grid" id="preview-keys-grid-target"></div>
      `;
      examCard.appendChild(keysSection);
      const keysGrid = document.getElementById("preview-keys-grid-target");
      
      questions.forEach((q, idx) => {
        const keyItem = document.createElement("div");
        const letter = ["А", "Б", "В", "Г"][q.correctAnswer];
        const bookLabel = q.book === "izhar" ? "Нәху" : q.book === "quduri" ? "Фиқһ" : q.book === "tahawi" ? "Ақида" : q.book === "sarf_izzi" ? "Сарф" : q.book === "miat_amil" ? "Нәху" : q.book === "nahw_tatbiqi" ? "Нахву" : q.book === "tahawi_text" ? "Ақида" : "Фиқһ";
        keyItem.innerHTML = `<strong>${idx + 1}-сұрақ:</strong> ${letter} (${bookLabel})`;
        keysGrid.appendChild(keyItem);
      });
    }
  };

  const renderExamPrint = (questions, format, includeKey) => {
    printPaperContainer.innerHTML = "";
    
    const printCard = document.createElement("div");
    printCard.className = "generated-exam-print";
    
    let booksText = [];
    const container = document.getElementById("teach-book-checkboxes");
    const checkedInputs = container.querySelectorAll("input[type='checkbox']:checked");
    checkedInputs.forEach(input => {
      const labelText = input.nextElementSibling.textContent.trim();
      booksText.push(labelText.replace(" кітабы", "").replace(" ақидасы", "").replace(" (Нәху)", "").replace(" (Фиқһ)", "").replace(" (Ақида)", "").replace(" (Мәтін)", ""));
    });
    
    const courseTitle = selectedCourse === "1-курс қыздар" ? "1-курс қыздар тобы" : "2-курс ұлдар тобы";
    
    printCard.innerHTML = `
      <div class="exam-header-print">
        <h1>Кәсіби Емтихан Билеті</h1>
        <h2>Пәні/Кітабы: ${booksText.join(" / ")}</h2>
        <p style="font-size: 11pt; margin-top: 1mm;">${courseTitle} бағдарламасы</p>
      </div>
      
      <div class="exam-meta-print">
        <div class="meta-line"><strong>Шәкірттің аты-жөні:</strong> _______________________________________________</div>
        <div class="meta-line"><strong>Бағалау / Балл:</strong> ______________________</div>
        <div class="meta-line"><strong>Курсы, тобы:</strong> ${courseTitle}</div>
        <div class="meta-line"><strong>Күні:</strong> 2026 жыл, «____» ______________</div>
      </div>
      
      <div class="exam-instructions-print">
        <strong>Нұсқаулық:</strong> Сұрақтарды мұқият оқып шығыңыз. ${
          format === "with-options" ? 
          "Әр сұрақтың астындағы нұсқалардың ішінен тек бір ғана дұрыс жауапты шеңберлеп белгілеңіз." : 
          "Бұл ашық сұрақтар форматы. Сұрақтардың астындағы бос орындарға толық әрі жүйелі жазбаша жауап жазыңыз."
        } Жұмыс уақыты: 90 минут. Сәттілік тілейміз!
      </div>
      
      <div class="print-questions-list" id="print-q-list-target">
      </div>
    `;

    printPaperContainer.appendChild(printCard);
    const qListTarget = document.getElementById("print-q-list-target");

    questions.forEach((q, idx) => {
      const qItem = document.createElement("div");
      qItem.className = "print-q-item";

      if (format === "with-options") {
        qItem.innerHTML = `
          <div class="print-q-text">${idx + 1}. ${q.question}</div>
          <div class="print-q-options">
            <div class="print-opt-item"><strong>А)</strong> ${q.options[0]}</div>
            <div class="print-opt-item"><strong>Б)</strong> ${q.options[1]}</div>
            <div class="print-opt-item"><strong>В)</strong> ${q.options[2]}</div>
            <div class="print-opt-item"><strong>Г)</strong> ${q.options[3]}</div>
          </div>
        `;
      } else {
        qItem.innerHTML = `
          <div class="print-q-text">${idx + 1}. ${q.question}</div>
          <div class="print-q-open-space"></div>
        `;
      }
      qListTarget.appendChild(qItem);
    });

    if (includeKey) {
      const keysSection = document.createElement("div");
      keysSection.className = "print-keys-section";
      keysSection.innerHTML = `
        <h3>Жауап кілттері (Тек мұғалімдер үшін):</h3>
        <div class="print-keys-grid" id="print-keys-grid-target"></div>
      `;
      printCard.appendChild(keysSection);
      const keysGrid = document.getElementById("print-keys-grid-target");
      
      questions.forEach((q, idx) => {
        const keyItem = document.createElement("div");
        keyItem.className = "print-key-item";
        const letter = ["А", "Б", "В", "Г"][q.correctAnswer];
        const bookLabel = q.book === "izhar" ? "Нәху" : q.book === "quduri" ? "Фиқһ" : q.book === "tahawi" ? "Ақида" : q.book === "sarf_izzi" ? "Сарф" : q.book === "miat_amil" ? "Нәху" : q.book === "nahw_tatbiqi" ? "Нахву" : q.book === "tahawi_text" ? "Ақида" : "Фиқһ";
        keyItem.innerHTML = `<strong>${idx + 1}-сұрақ:</strong> ${letter} (${bookLabel})`;
        keysGrid.appendChild(keyItem);
      });
    }
  };

  printExamBtn.addEventListener("click", () => {
    window.print();
  });

  // ==========================================================================
  // 9. STUDENT PERSISTED RESULTS (TEACHER PANEL ONLY)
  // ==========================================================================

  // Load results from Node server API
  const loadStudentResults = () => {
    studentResultsTbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted);">
          <i class="fa-solid fa-spinner fa-spin"></i> Деректер жүктелуде...
        </td>
      </tr>
    `;

    fetch('/api/results')
      .then(res => {
        if (!res.ok) throw new Error("Серверден деректер алынбады");
        return res.json();
      })
      .then(data => {
        renderStudentResultsTable(data);
      })
      .catch(err => {
        console.error("Error loading results:", err);
        studentResultsTbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 20px; color: var(--accent-danger); font-weight: 600;">
              <i class="fa-solid fa-circle-exclamation"></i> Сервермен байланыс орнату мүмкін болмады. Сервердің қосылып тұрғанын тексеріңіз.
            </td>
          </tr>
        `;
      });
  };

  // Render results list in the table
  const renderStudentResultsTable = (results) => {
    studentResultsTbody.innerHTML = "";
    
    if (results.length === 0) {
      studentResultsTbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
            <i class="fa-solid fa-folder-open" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
            Әзірге ешқандай шәкірт тест тапсырған жоқ.
          </td>
        </tr>
      `;
      return;
    }

    // Sort results descending by date/id
    const sortedResults = [...results].reverse();

    sortedResults.forEach(r => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid var(--border-color)";
      
      // Select score badge color
      let percentClass = "color: var(--accent-danger); font-weight: bold;";
      if (r.percent >= 90) {
        percentClass = "color: var(--accent-success); font-weight: bold;";
      } else if (r.percent >= 70) {
        percentClass = "color: var(--color-gold); font-weight: bold;";
      } else if (r.percent >= 50) {
        percentClass = "color: var(--accent-warning); font-weight: bold;";
      }

      tr.innerHTML = `
        <td style="padding: 12px 16px; font-weight: 600;">${r.name}</td>
        <td style="padding: 12px 16px; color: var(--text-secondary);">${r.group}</td>
        <td style="padding: 12px 16px;">
          <span class="badge" style="font-size: 11px;">${r.book}</span>
        </td>
        <td style="padding: 12px 16px; font-weight: 600;">${r.score} / ${r.total}</td>
        <td style="padding: 12px 16px; ${percentClass}">${r.percent}%</td>
        <td style="padding: 12px 16px; color: var(--text-muted); font-size: 12px;">${r.date}</td>
        <td style="padding: 12px 16px;">
          <button class="delete-row-btn" data-id="${r.id}" title="Нәтижені өшіру">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      `;

      // Bind delete single score
      const deleteBtn = tr.querySelector(".delete-row-btn");
      deleteBtn.addEventListener("click", () => {
        if (confirm(`Шын мәнінде ${r.name} есімді студенттің нәтижесін өшіргіңіз келе ме?`)) {
          deleteStudentResult(r.id);
        }
      });

      studentResultsTbody.appendChild(tr);
    });
  };

  // Delete single result API call
  const deleteStudentResult = (id) => {
    fetch(`/api/results/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        console.log(data.message);
        loadStudentResults();
      })
      .catch(err => console.error("Error deleting result:", err));
  };

  // Clear all results API call
  const clearAllResults = () => {
    if (confirm("🚨 ЕСКЕРТУ: Барлық шәкірттердің емтихан қорытындыларын базадан толықтай тазартқыңыз келе ме? Бұл әрекетті кері қайтару мүмкін емес!")) {
      fetch('/api/results', { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          console.log(data.message);
          loadStudentResults();
        })
        .catch(err => console.error("Error clearing results:", err));
    }
  };

  // Export Student Results to Excel CSV with Cyrillic BOM support
  const exportResultsToExcel = () => {
    fetch('/api/results')
      .then(res => {
        if (!res.ok) throw new Error("Серверден деректер алынбады");
        return res.json();
      })
      .then(results => {
        if (results.length === 0) {
          alert("Экспорттау үшін шәкірттердің емтихан нәтижелері табылдады!");
          return;
        }

        // CSV Headers in academic Kazakh
        const headers = ["Шәкірттің аты-жөні", "Тобы / Курсы", "Емтихан пәні", "Балл", "Пайыздық көрсеткіш", "Тапсырған уақыты"];
        
        // UTF-8 BOM so Excel opens Cyrillic / Kazakh characters correctly!
        let csvContent = "\uFEFF";
        csvContent += headers.join(";") + "\n";

        results.forEach(r => {
          const row = [
            r.name,
            r.group,
            r.book,
            `${r.score} / ${r.total}`,
            `${r.percent}%`,
            r.date
          ];
          // Escape quotes
          const escapedRow = row.map(val => `"${val.toString().replace(/"/g, '""')}"`);
          csvContent += escapedRow.join(";") + "\n";
        });

        // Create Blob and trigger dynamic download
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        link.setAttribute("href", url);
        link.setAttribute("download", `Емтихан_Нәтижелері_${new Date().toLocaleDateString('kk-KZ')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(err => {
        console.error("Error exporting results:", err);
        alert("Экспорттау кезінде қате орын алды: " + err.message);
      });
  };

  const exportExcelBtn = document.getElementById("export-excel-btn");
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", exportResultsToExcel);
  }

  refreshResultsBtn.addEventListener("click", loadStudentResults);
  clearAllResultsBtn.addEventListener("click", clearAllResults);

  // Load questions from server dynamically
  const loadQuestions = async () => {
    try {
      const response = await fetch('/api/questions');
      if (response.ok) {
        examQuestions = await response.json();
        console.log("Loaded questions from server successfully:", examQuestions.length);
      } else {
        throw new Error("Failed to load questions");
      }
    } catch (error) {
      console.error("Failed to fetch questions from server, falling back to static questions:", error);
      if (typeof window.examQuestions !== 'undefined') {
        examQuestions = window.examQuestions;
      } else {
        examQuestions = [];
      }
    }
    // After loading, render the books list if it's the active tab
    if (activeTab === "books-view") {
      renderQuestionsList();
    }
    renderDashboard();
  };

  // Run Session check and load questions on load
  checkUserSession();
  loadQuestions();
});

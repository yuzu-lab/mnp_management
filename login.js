// login.js
const PASSWORD = "yuzu123";  // 設定したいパスワード

document.addEventListener("DOMContentLoaded", () => {
  const loginScreen = document.getElementById("loginScreen");
  const mainApp = document.getElementById("mainApp");
  const loginBtn = document.getElementById("loginBtn");
  const passwordInput = document.getElementById("passwordInput");
  const loginHint = document.getElementById("loginHint");

  loginBtn.addEventListener("click", () => {
    if (passwordInput.value === PASSWORD) {
      loginScreen.style.display = "none";
      mainApp.style.display = "block";
    } else {
      loginHint.textContent = "パスワードが違います";
      passwordInput.value = "";
      passwordInput.focus();
    }
  });

  // Enterキーでもログインできるように
  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      loginBtn.click();
    }
  });
});

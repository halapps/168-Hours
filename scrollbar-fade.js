(() => {
  const sidebarContent = document.querySelector(".sidebar-content");
  if (!sidebarContent) return;

  let hideTimer = null;

  const showScrollbar = () => {
    sidebarContent.classList.add("scrollbar-active");
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      sidebarContent.classList.remove("scrollbar-active");
      hideTimer = null;
    }, 1800);
  };

  sidebarContent.addEventListener("scroll", showScrollbar, { passive: true });
  sidebarContent.addEventListener("wheel", showScrollbar, { passive: true });
  sidebarContent.addEventListener("touchmove", showScrollbar, { passive: true });
})();

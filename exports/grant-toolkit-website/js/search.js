// Simple search functionality for Grant Toolkit
document.addEventListener('DOMContentLoaded', function() {
    // Add search functionality if needed
    console.log('Grant Toolkit website loaded successfully');
    
    // Add smooth scrolling for anchor links
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Add mobile menu toggle if needed
    const nav = document.querySelector('.nav');
    if (window.innerWidth <= 768) {
        // Mobile-specific functionality can be added here
    }
});

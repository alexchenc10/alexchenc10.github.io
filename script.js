// DOM Elements
const sections = document.querySelectorAll('.section');
const navItems = document.querySelectorAll('.nav-item');
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const leftColumn = document.querySelector('.left-column');
const rightColumn = document.querySelector('.right-column');
const cvDownloadBtn = document.getElementById('cv-download');

// Show specific section with animation
function showSection(sectionId) {
    // Hide all sections
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Deactivate all nav items
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section with GSAP animation only if section exists
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    } else {
        console.warn(`Section with id '${sectionId}' not found`);
        return;
    }
    
    // Highlight active nav item
    const activeNavItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Animate section content using GSAP
    gsap.fromTo(targetSection.querySelectorAll('.card'), 
        { opacity: 0, y: 20 }, 
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }
    );
    
    // Close mobile menu on section selection
    if (window.innerWidth <= 768) {
        leftColumn.classList.remove('active');
    }
}

// Handle navigation clicks
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        const sectionId = item.getAttribute('data-section');
        
        // Only prevent default and show section if data-section attribute exists
        // This allows external links like CV to work normally
        if (sectionId) {
            e.preventDefault();
            showSection(sectionId);
        }
    });
});

// Mobile menu toggle
mobileMenuToggle.addEventListener('click', () => {
    leftColumn.classList.toggle('active');
    
    // Animate mobile menu
    if (leftColumn.classList.contains('active')) {
        gsap.fromTo(leftColumn, 
            { x: '-100%' }, 
            { x: '0%', duration: 0.3 }
        );
    } else {
        gsap.to(leftColumn, 
            { x: '-100%', duration: 0.3 }
        );
    }
});

// Close mobile menu when clicking outside on mobile
rightColumn.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && leftColumn.classList.contains('active')) {
        // Check if click is not on a nav link or mobile toggle
        if (!e.target.closest('.left-column') && !e.target.closest('.mobile-menu-toggle')) {
            leftColumn.classList.remove('active');
            gsap.to(leftColumn, 
                { x: '-100%', duration: 0.3 }
            );
        }
    }
});

// CV Download functionality (using the existing markdown to PDF conversion)
function setupCVDownload() {
    if (cvDownloadBtn) {
        cvDownloadBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Add loading indicator
            const originalText = cvDownloadBtn.innerHTML;
            cvDownloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
            cvDownloadBtn.disabled = true;
            
            try {
                await downloadMarkdownAsPDF();
            } catch (error) {
                console.error('Error generating PDF:', error);
                alert('Failed to generate PDF. Please try again.');
            } finally {
                // Restore original button state
                cvDownloadBtn.innerHTML = originalText;
                cvDownloadBtn.disabled = false;
            }
        });
    }
}

// Download markdown as PDF
async function downloadMarkdownAsPDF() {
    try {
        // Check if cv.md exists and load it
        const response = await fetch('cv.md');
        
        if (!response.ok) {
            // If cv.md doesn't exist, create a simple PDF
            const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            const doc = new jsPDF();
            
            doc.setFontSize(18);
            doc.text('Cheng Chen', 20, 30);
            
            doc.setFontSize(14);
            doc.text('Researcher, Tongji University', 20, 40);
            
            doc.setFontSize(12);
            doc.text('CV Download', 20, 60);
            doc.text('This is a placeholder for the CV.', 20, 70);
            doc.text('Please create a cv.md file with your resume content.', 20, 80);
            
            doc.save('Cheng_Chen_CV.pdf');
            return;
        }
        
        const markdown = await response.text();
        
        // Load necessary libraries dynamically
        await Promise.all([
            import('https://cdn.jsdelivr.net/npm/marked/marked.min.js'),
            import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
            import('https://html2canvas.hertzen.com/dist/html2canvas.min.js')
        ]);
        
        // Convert markdown to HTML
        const html = marked.parse(markdown);
        
        // Create a temporary container for the HTML
        const container = document.createElement('div');
        container.innerHTML = html;
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '794px'; // A4 width in pixels at 96dpi
        container.style.padding = '40px';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.backgroundColor = 'white';
        document.body.appendChild(container);
        
        // Add styling to the container
        const style = document.createElement('style');
        style.textContent = `
            h1 { font-size: 24px; margin-bottom: 10px; }
            h2 { font-size: 20px; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            h3 { font-size: 16px; margin-top: 15px; margin-bottom: 8px; }
            p { margin-bottom: 10px; line-height: 1.5; }
            ul, ol { margin-left: 20px; margin-bottom: 15px; }
            li { margin-bottom: 5px; }
            .container a { color: #0056B3; }
        `;
        container.appendChild(style);
        
        // Use html2canvas to capture the HTML content
        const canvas = await html2canvas(container, {
            scale: 2, // Higher quality
            useCORS: true,
            logging: false
        });
        
        // Create PDF from canvas
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        
        // Add image to PDF
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        // Add additional pages if needed
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        // Clean up
        document.body.removeChild(container);
        
        // Save PDF
        pdf.save('Cheng_Chen_CV.pdf');
    } catch (error) {
        console.error('Error downloading markdown as PDF:', error);
        throw error;
    }
}

// Add loading styles for spinner
function addLoadingStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .fa-spin {
            animation: spin 1s linear infinite;
        }
        button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Show the default section (about)
    showSection('about');
    
    // Setup CV download functionality
    setupCVDownload();
    
    // Add loading styles
    addLoadingStyles();
    
    // Add smooth hover animations to buttons
    const buttons = document.querySelectorAll('a, button');
    buttons.forEach(button => {
        // Skip social links and publication links as they have their own animations
        if (button.closest('.social-links') || button.closest('.publication-links')) {
            return;
        }
        
        button.addEventListener('mouseenter', () => {
            gsap.to(button, { scale: 1.03, duration: 0.2 });
        });
        
        button.addEventListener('mouseleave', () => {
            gsap.to(button, { scale: 1, duration: 0.2 });
        });
    });
    
    // Add animations to skill pills
    const skillPills = document.querySelectorAll('.skill-pill');
    skillPills.forEach((pill, index) => {
        pill.addEventListener('mouseenter', () => {
            gsap.to(pill, { 
                scale: 1.05, 
                backgroundColor: '#0056B3',
                color: 'white',
                duration: 0.2 
            });
        });
        
        pill.addEventListener('mouseleave', () => {
            gsap.to(pill, { 
                scale: 1, 
                backgroundColor: '#F0F4F8',
                color: '#111111',
                duration: 0.2 
            });
        });
    });
    
    // Handle window resize for responsive behavior
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            leftColumn.classList.remove('active');
        }
    });
});
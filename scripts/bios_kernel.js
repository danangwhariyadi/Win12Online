// BIOS Kernel Logic for Win12 OL

let tab = 0;
let foc = 0;
const tabs = ['main', 'advanced', 'security', 'boot', 'exit'];

// Current configuration state
const biosConfig = {
    cpuHyperThreading: 'Enabled',
    cpuTurboBoost: 'Enabled',
    cpuCoreRatio: 'Auto',
    memoryFrequency: 'Auto',
    memoryTimingMode: 'Auto',
    xmpProfile: 'Disabled',
    tpmState: 'Enabled',
    secureBoot: 'Enabled',
    fastBoot: 'Enabled',
    bootMode: 'UEFI',
    bootPriority: 'Hard Drive' // 'Hard Drive' or 'USB Installation Media'
};

// Load existing biosConfig from server API or fallback to localStorage if it exists
function loadSavedConfig() {
    fetch('/api/bios-config')
        .then(response => response.json())
        .then(data => {
            Object.assign(biosConfig, data);
            updateUIFromConfig();
        })
        .catch(err => {
            console.error("Failed to load bios config from API, trying localStorage", err);
            const savedConfig = localStorage.getItem('bios_config');
            if (savedConfig) {
                try {
                    const parsed = JSON.parse(savedConfig);
                    Object.assign(biosConfig, parsed);
                } catch (e) {
                    console.error("Failed to parse bios_config from localStorage", e);
                }
            } else {
                const savedBootDevice = localStorage.getItem('boot_device');
                if (savedBootDevice === 'usb') {
                    biosConfig.bootPriority = 'USB Installation Media';
                } else if (savedBootDevice === 'hdd') {
                    biosConfig.bootPriority = 'Hard Drive';
                }
                const savedBootMode = localStorage.getItem('boot_mode');
                if (savedBootMode === 'UEFI' || savedBootMode === 'Legacy') {
                    biosConfig.bootMode = savedBootMode;
                }
            }
            updateUIFromConfig();
        });
}

function updateUIFromConfig() {
    $('#row-hyperthreading .value.option').text(`[${biosConfig.cpuHyperThreading}]`);
    $('#row-turboboost .value.option').text(`[${biosConfig.cpuTurboBoost}]`);
    $('#row-coreratio .value.option').text(`[${biosConfig.cpuCoreRatio}]`);
    $('#row-memfreq .value.option').text(`[${biosConfig.memoryFrequency}]`);
    $('#row-memtiming .value.option').text(`[${biosConfig.memoryTimingMode}]`);
    $('#row-xmpprof .value.option').text(`[${biosConfig.xmpProfile}]`);
    $('#row-tpm .value.option').text(`[${biosConfig.tpmState}]`);
    $('#row-secureboot .value.option').text(`[${biosConfig.secureBoot}]`);
    $('#row-fastboot .value.option').text(`[${biosConfig.fastBoot}]`);
    $('#row-bootmode .value.option').text(`[${biosConfig.bootMode}]`);
    
    $('#val-bootpriority').text(`[${biosConfig.bootPriority}]`);
    const secondaryDevice = biosConfig.bootPriority === 'Hard Drive' ? 'USB Installation Media' : 'Hard Drive';
    $('#val-bootpriority2').text(secondaryDevice);
}

// Handle System Date and Time
function formatTwoDigits(num) {
    return num < 10 ? `0${num}` : num;
}

let systemTimeInterval;
let customTimeOffset = 0; // Milliseconds offset from local time

function updateDateTimeDisplay() {
    const d = new Date(Date.now() + customTimeOffset);
    $('#time').text(`[${formatTwoDigits(d.getHours())}:${formatTwoDigits(d.getMinutes())}:${formatTwoDigits(d.getSeconds())}]`);
    $('#date').text(`[${formatTwoDigits(d.getMonth() + 1)}/${formatTwoDigits(d.getDate())}/${d.getFullYear()}]`);
}

function startClock() {
    updateDateTimeDisplay();
    systemTimeInterval = setInterval(updateDateTimeDisplay, 1000);
}

// Prompt for time change
function changeSystemTime() {
    const d = new Date(Date.now() + customTimeOffset);
    const currentTimeStr = `${formatTwoDigits(d.getHours())}:${formatTwoDigits(d.getMinutes())}:${formatTwoDigits(d.getSeconds())}`;
    const newTime = prompt("Enter new System Time (HH:MM:SS format):", currentTimeStr);
    if (newTime) {
        const parts = newTime.split(':');
        if (parts.length === 3) {
            const h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const s = parseInt(parts[2], 10);
            if (!isNaN(h) && h >= 0 && h < 24 && !isNaN(m) && m >= 0 && m < 60 && !isNaN(s) && s >= 0 && s < 60) {
                const targetDate = new Date(d);
                targetDate.setHours(h, m, s);
                customTimeOffset = targetDate.getTime() - Date.now();
                updateDateTimeDisplay();
            } else {
                alert("Invalid time values. Hours: 0-23, Minutes: 0-59, Seconds: 0-59.");
            }
        } else {
            alert("Please use HH:MM:SS format.");
        }
    }
}

// Prompt for date change
function changeSystemDate() {
    const d = new Date(Date.now() + customTimeOffset);
    const currentDateStr = `${formatTwoDigits(d.getMonth() + 1)}/${formatTwoDigits(d.getDate())}/${d.getFullYear()}`;
    const newDate = prompt("Enter new System Date (MM/DD/YYYY format):", currentDateStr);
    if (newDate) {
        const parts = newDate.split('/');
        if (parts.length === 3) {
            const m = parseInt(parts[0], 10);
            const rDate = parseInt(parts[1], 10);
            const y = parseInt(parts[2], 10);
            if (!isNaN(m) && m >= 1 && m <= 12 && !isNaN(rDate) && rDate >= 1 && rDate <= 31 && !isNaN(y) && y >= 2000 && y < 3000) {
                const targetDate = new Date(d);
                targetDate.setFullYear(y, m - 1, rDate);
                customTimeOffset = targetDate.getTime() - Date.now();
                updateDateTimeDisplay();
            } else {
                alert("Invalid date values. Month: 1-12, Day: 1-31, Year: 2000-2999.");
            }
        } else {
            alert("Please use MM/DD/YYYY format.");
        }
    }
}

// Tab navigation handler
function changePage(t) {
    tab = t;
    $('.tab').removeClass('show foc');
    $(`#${tabs[tab]}`).addClass('show foc');
    $('.page').removeClass('show');
    $(`#${tabs[tab]}Page`).addClass('show');
    
    // Reset focus row index for the newly opened page
    foc = 0;
    updateFocusHighlights();
}

// Update focus highlighting and right-hand side help texts
function updateFocusHighlights() {
    const activePage = $(`#${tabs[tab]}Page`);
    const selectables = activePage.find('.selectable-row');
    
    // Clear previous highlight
    activePage.find('.selectable-row').removeClass('focused-row');
    
    if (selectables.length > 0) {
        // Clamp focus
        if (foc < 0) foc = 0;
        if (foc >= selectables.length) foc = selectables.length - 1;
        
        const currentFocusedItem = $(selectables[foc]);
        currentFocusedItem.addClass('focused-row');
        
        // Scroll into view if needed
        const settingsCol = activePage.find('.settings-col');
        if (settingsCol.length > 0) {
            const containerHeight = settingsCol.height();
            const elementTop = currentFocusedItem.position().top;
            const elementHeight = currentFocusedItem.outerHeight();
            
            if (elementTop < 0) {
                settingsCol.scrollTop(settingsCol.scrollTop() + elementTop);
            } else if (elementTop + elementHeight > containerHeight) {
                settingsCol.scrollTop(settingsCol.scrollTop() + elementTop + elementHeight - containerHeight);
            }
        }
        
        // Update item-specific help text
        const helpText = currentFocusedItem.attr('data-help') || "Select an item and press Enter to toggle/modify.";
        $(`#help-text-${tab}`).text(helpText);
    }
}

// Toggle options
function handleOptionAction(item) {
    const optionId = item.attr('data-option');
    const rowId = item.attr('id');
    
    if (rowId === 'row-time') {
        changeSystemTime();
        return;
    }
    if (rowId === 'row-date') {
        changeSystemDate();
        return;
    }
    
    if (optionId === 'bootPriority') {
        toggleBootPriority();
        return;
    }
    
    if (optionId === 'bootMode') {
        biosConfig.bootMode = biosConfig.bootMode === 'UEFI' ? 'Legacy' : 'UEFI';
        item.find('.value.option').text(`[${biosConfig.bootMode}]`);
        return;
    }
    
    if (optionId) {
        const currentValue = biosConfig[optionId];
        let newValue = currentValue;
        
        if (currentValue === 'Enabled') newValue = 'Disabled';
        else if (currentValue === 'Disabled') newValue = 'Enabled';
        else if (currentValue === 'Auto') newValue = 'Manual';
        else if (currentValue === 'Manual') newValue = 'Auto';
        
        biosConfig[optionId] = newValue;
        
        // Update UI
        item.find('.value.option').text(`[${newValue}]`);
    }
    
    // Exit Page Actions
    const action = item.attr('data-action');
    if (action) {
        if (action === 'save') {
            openConfirmDialog("Save configuration changes and exit now?", 'save');
        } else if (action === 'discard') {
            openConfirmDialog("Discard changes and exit setup?", 'discard');
        } else if (action === 'defaults') {
            openConfirmDialog("Restore default setup parameters?", 'defaults');
        }
    }
}

// Boot Priority Toggling
function toggleBootPriority() {
    if (biosConfig.bootPriority === 'Hard Drive') {
        biosConfig.bootPriority = 'USB Installation Media';
    } else {
        biosConfig.bootPriority = 'Hard Drive';
    }
    
    // Update labels
    $('#val-bootpriority').text(`[${biosConfig.bootPriority}]`);
    const secondaryDevice = biosConfig.bootPriority === 'Hard Drive' ? 'USB Installation Media' : 'Hard Drive';
    $('#val-bootpriority2').text(secondaryDevice);
}

// Exit Confirm Dialog Mechanics
let confirmActionType = ''; // 'save', 'discard', 'defaults'
let confirmButtonFocus = 0; // 0 for [ Yes ], 1 for [ No ]

function openConfirmDialog(message, actionType) {
    confirmActionType = actionType;
    confirmButtonFocus = 0; // Default to 'Yes'
    $('#confirm-tit').text(message);
    $('#confirmContainer').css('display', 'flex');
    $('#confirm').attr('data-show', 'true');
    updateConfirmButtonHighlights();
}

function closeConfirmDialog() {
    $('#confirmContainer').css('display', 'none');
    $('#confirm').attr('data-show', 'false');
    confirmActionType = '';
}

function updateConfirmButtonHighlights() {
    $('.confirm-button').removeClass('selected-btn');
    if (confirmButtonFocus === 0) {
        $('#ok-btn').addClass('selected-btn');
    } else {
        $('#cancel-btn').addClass('selected-btn');
    }
}

function executeConfirmAction() {
    const isYes = (confirmButtonFocus === 0);
    closeConfirmDialog();
    
    if (isYes) {
        if (confirmActionType === 'save') {
            // Save boot device and boot mode in local storage
            const savedBootDevice = biosConfig.bootPriority === 'USB Installation Media' ? 'usb' : 'hdd';
            localStorage.setItem('boot_device', savedBootDevice);
            localStorage.setItem('boot_mode', biosConfig.bootMode);
            localStorage.setItem('bios_config', JSON.stringify(biosConfig));
            
            // Faux reboot sequence
            rebootSystem();
        } 
        else if (confirmActionType === 'discard') {
            // Reboot without saving current session's changes
            rebootSystem();
        } 
        else if (confirmActionType === 'defaults') {
            // Restore default configuration
            biosConfig.bootPriority = 'Hard Drive';
            biosConfig.cpuHyperThreading = 'Enabled';
            biosConfig.cpuTurboBoost = 'Enabled';
            biosConfig.cpuCoreRatio = 'Auto';
            biosConfig.memoryFrequency = 'Auto';
            biosConfig.memoryTimingMode = 'Auto';
            biosConfig.xmpProfile = 'Disabled';
            biosConfig.tpmState = 'Enabled';
            biosConfig.secureBoot = 'Enabled';
            biosConfig.fastBoot = 'Enabled';
            biosConfig.bootMode = 'UEFI';
            
            // Update UI across all pages
            updateUIFromConfig();
        }
    }
}

function rebootSystem() {
    clearInterval(systemTimeInterval);
    $('body').html(`
        <div style="background-color: black; width:100%; height:100%; display:flex; justify-content:center; align-items:center; color:white; font-size:1.5rem;">
            <span>Rebooting...</span>
        </div>
    `);
    setTimeout(() => {
        window.location.href = './boot.html';
    }, 1200);
}

// Global Key Listeners for BIOS setup keyboard handling
window.onkeydown = (e) => {
    const isDialogActive = ($('#confirm').attr('data-show') === 'true');
    
    if (isDialogActive) {
        // Dialog active navigation
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Tab') {
            e.preventDefault();
            confirmButtonFocus = confirmButtonFocus === 0 ? 1 : 0;
            updateConfirmButtonHighlights();
        } 
        else if (e.key === 'Enter') {
            e.preventDefault();
            executeConfirmAction();
        } 
        else if (e.key === 'Escape') {
            e.preventDefault();
            closeConfirmDialog();
        }
    } else {
        // BIOS options navigation
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            let nextTab = tab - 1;
            if (nextTab < 0) nextTab = tabs.length - 1;
            changePage(nextTab);
        } 
        else if (e.key === 'ArrowRight') {
            e.preventDefault();
            let nextTab = tab + 1;
            if (nextTab >= tabs.length) nextTab = 0;
            changePage(nextTab);
        } 
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (foc > 0) {
                foc--;
                updateFocusHighlights();
            }
        } 
        else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const activePage = $(`#${tabs[tab]}Page`);
            const selectables = activePage.find('.selectable-row');
            if (foc < selectables.length - 1) {
                foc++;
                updateFocusHighlights();
            }
        } 
        else if (e.key === 'Enter') {
            e.preventDefault();
            const activePage = $(`#${tabs[tab]}Page`);
            const selectables = activePage.find('.selectable-row');
            if (selectables.length > 0 && foc >= 0 && foc < selectables.length) {
                handleOptionAction($(selectables[foc]));
            }
        } 
        else if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            // Trigger same action as Enter to cycle or change
            const activePage = $(`#${tabs[tab]}Page`);
            const selectables = activePage.find('.selectable-row');
            if (selectables.length > 0 && foc >= 0 && foc < selectables.length) {
                handleOptionAction($(selectables[foc]));
            }
        } 
        else if (e.key === '-' || e.key === '_') {
            e.preventDefault();
            // Trigger same action as Enter to cycle backwards
            const activePage = $(`#${tabs[tab]}Page`);
            const selectables = activePage.find('.selectable-row');
            if (selectables.length > 0 && foc >= 0 && foc < selectables.length) {
                handleOptionAction($(selectables[foc]));
            }
        } 
        else if (e.key === 'Escape') {
            e.preventDefault();
            // Go to Exit tab or open discard warning dialog
            if (tab === 4) {
                openConfirmDialog("Discard changes and exit setup?", 'discard');
            } else {
                changePage(4);
            }
        } 
        else if (e.key === 'F10') {
            e.preventDefault();
            openConfirmDialog("Save configuration changes and exit now?", 'save');
        } 
        else if (e.key === 'F1') {
            e.preventDefault();
            alert("BIOS Setup Utility Help:\nUse Left/Right arrows to switch screens.\nUse Up/Down arrows to select items.\nPress Enter or +/- to modify settings.\nPress F10 to Save and Exit.\nPress ESC to Exit Setup.");
        }
    }
};

// Touch/Mouse interaction fallback
$(document).ready(() => {
    startClock();
    loadSavedConfig();
    changePage(0);
    
    // Bind click handlers to all selectable-rows
    $(document).on('click', '.selectable-row', function() {
        const row = $(this);
        const parentPage = row.closest('.page');
        const pageId = parentPage.attr('id');
        
        // Determine tab index of this page
        let clickedTab = 0;
        for (let i = 0; i < tabs.length; i++) {
            if (pageId === `${tabs[i]}Page`) {
                clickedTab = i;
                break;
            }
        }
        
        if (clickedTab !== tab) {
            changePage(clickedTab);
        }
        
        // Determine selectable index inside this page
        const selectables = parentPage.find('.selectable-row');
        foc = selectables.index(row);
        updateFocusHighlights();
        
        // Handle action
        handleOptionAction(row);
    });
    
    // Bind confirmation dialog buttons click
    $('#ok-btn').on('click', () => {
        confirmButtonFocus = 0;
        executeConfirmAction();
    });
    
    $('#cancel-btn').on('click', () => {
        confirmButtonFocus = 1;
        executeConfirmAction();
    });
    
    document.oncontextmenu = () => false;
});

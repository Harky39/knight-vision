const color_picker = $("#color-picker-input");
const max_depth = $("#max-depth");
const depth_plan_note = $("#depth-plan-note");

chrome.storage.local.get(['engine_highlight_color', 'isPro'], result => {
    console.log("Engine move highlight color set to " + result.engine_highlight_color);
    color_picker.val(result.engine_highlight_color);

    const isPro = result.isPro === true;
    max_depth.text(isPro ? '25' : '15');
    depth_plan_note.text(isPro ? 'Pro • deeper analysis' : 'Free • Upgrade to Pro for depth 25');
});

color_picker.change(function(event) {
    console.log("Engine move highlight color set to " + event.target.value);
    chrome.storage.local.set({'engine_highlight_color': event.target.value});
});

chrome.storage.onChanged.addListener(function(changes) {
    if ('isPro' in changes) {
        const isPro = changes.isPro.newValue === true;
        max_depth.text(isPro ? '25' : '15');
        depth_plan_note.text(isPro ? 'Pro • deeper analysis' : 'Free • Upgrade to Pro for depth 25');
    }
});

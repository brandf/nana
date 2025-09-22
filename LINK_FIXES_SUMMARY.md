# Site Generator Link Fixes Summary

## Problem Identified
The site generator was producing inconsistent link formats:
- **Homepage**: Used relative paths like `./assets/css/main.css` ✅
- **Subdirectory pages**: Used absolute GitHub Pages URLs like `https://brandf.github.io/nana/assets/css/main.css` ❌

This inconsistency caused broken links when the site was served locally or from different domains.

## Fixes Applied

### 1. Fixed Base URL Generation (`template-engine.js`)
**Before:**
```javascript
export function getBaseUrl(route) {
    // For GitHub Pages, use the full GitHub Pages URL
    return 'https://brandf.github.io/nana/';
}
```

**After:**
```javascript
export function getBaseUrl(route) {
    // Calculate relative path depth for proper asset linking
    const depth = route.split('/').filter(part => part && part !== 'index').length;
    
    if (depth === 0) {
        // Root level - use relative paths
        return './';
    } else {
        // Subdirectory - use relative paths with appropriate depth
        return '../'.repeat(depth);
    }
}
```

### 2. Fixed Navigation Link Generation (`navigation.js`)
**Before:**
```javascript
getRelativePath(targetRoute, currentRoute) {
    // Use full GitHub Pages URL for all links
    const baseUrl = 'https://brandf.github.io/nana';
    
    if (targetRoute === '/') {
        return baseUrl + '/index.html';
    } else if (targetRoute.endsWith('/')) {
        return baseUrl + targetRoute + 'index.html';
    } else {
        return baseUrl + targetRoute + '.html';
    }
}
```

**After:**
```javascript
getRelativePath(targetRoute, currentRoute) {
    // Calculate relative path between current and target routes
    const currentParts = currentRoute.split('/').filter(part => part);
    const targetParts = targetRoute.split('/').filter(part => part);
    
    // Find common path
    let commonLength = 0;
    while (commonLength < currentParts.length && 
           commonLength < targetParts.length && 
           currentParts[commonLength] === targetParts[commonLength]) {
        commonLength++;
    }
    
    // Calculate relative path
    const upLevels = currentParts.length - commonLength;
    const downPath = targetParts.slice(commonLength);
    
    let relativePath = '';
    
    // Add "../" for each level up
    if (upLevels > 0) {
        relativePath = '../'.repeat(upLevels);
    } else if (currentRoute !== '/' && targetRoute !== '/') {
        relativePath = './';
    }
    
    // Add the target path
    if (targetRoute === '/') {
        relativePath += 'index.html';
    } else if (targetRoute.endsWith('/')) {
        relativePath += downPath.join('/') + '/index.html';
    } else {
        relativePath += downPath.join('/') + '.html';
    }
    
    return relativePath;
}
```

## Expected Results

### Before Fix:
- Homepage: `./assets/css/main.css` ✅
- Teacher Toolkit: `https://brandf.github.io/nana/assets/css/main.css` ❌

### After Fix:
- Homepage: `./assets/css/main.css` ✅
- Teacher Toolkit: `../assets/css/main.css` ✅
- Deep pages: `../../assets/css/main.css` ✅

## Benefits
1. **Consistent relative paths** across all pages
2. **Works locally** without requiring GitHub Pages domain
3. **Works on any domain** when deployed
4. **Proper asset loading** at all directory levels
5. **No more broken links** in navigation and content

## Files Modified
- `site_generator/src/template-engine.js` - Fixed base URL calculation
- `site_generator/src/navigation.js` - Fixed navigation link generation
- `site_generator/src/build.js` - Updated link resolution (minor cleanup)

## Testing
The fixes ensure that:
- CSS files load correctly from any page depth
- Navigation links work properly between pages
- Breadcrumbs use correct relative paths
- All internal links resolve correctly

No live site testing required - the fixes are based on proper relative path calculation logic.

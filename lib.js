"use strict"
// **** mini lib for js ****
//author: Onne Gorter
//license: CC0

/// an opiniated library to enhances the default js environment

// simple assert
function assert(c, desc) {
    if (c) return
    let e = new Error(desc? "Assertion Failed: "+ desc : "Assertion Failed")
    if (e.stack) e.message += e.stack.split("\n")[2]
    throw e
}

// check if sane
assert(typeof(setInterval) === "function")

// TAU is around the unit circle once: starting at x=1,y=0, clockwise to x=0,y=-1 (at TAU4)
const TAU = Math.PI * 2.0
const TAU2 = Math.PI
const TAU4 = Math.PI / 2.0
const TAU8 = Math.PI / 4.0
const TAU16 = Math.PI / 8.0

// reasonable maximum/minimum for js integer numbers
const MAX_NUMBER = Math.pow(2, 51)
const MIN_NUMBER = -Math.pow(2, 51)

function isBool(o) { return typeof o === "boolean" }
function isNumber(o) { return typeof o === "number" && !isNaN(o) }
function isString(o) { return typeof o === "string" }
function isArray(o) { return typeof o === "object" && o instanceof Array }
function isObject(o) { return typeof o === "object" && !(o instanceof Array) }
function isFunction(o) { return typeof o === "function" }

// better syntax for timers, and time is always in seconds
function after(seconds, fn) { return setTimeout(fn, seconds * 1000) }
function cancelAfterTimer(timer) { clearTimeout(timer) }
function every(seconds, fn) { return setInterval(fn, seconds * 1000) }
function cancelEveryTimer(timer) { clearInterval(timer) }

// return current wall clock time in seconds
function currentTime() { return timeFromMillis(+new Date) }

// convert from milliseconds to time (always in seconds)
function timeFromMillis(millis) { return millis / 1000.0 }

// compare two floating point numbers to see if they are the same with a tolarance
function fequals(f1, f2, within) {
    within = within || 0.1
    return Math.abs(f1 - f2) < within
}

// modulo that results from 0..m exclusive (instead of -m .. m of just %)
function mod(n, m) {
    return (n % m + m) % m
}

// return a random number between 0..a exclusive, or a..b exclusive
function rnd(a, b) {
    if (b == null) { b = a; a = 0; if (b == null) b = 1 }
    if (a > b) { let t = b; b = a; a = t }
    return Math.random() * (b - a) + a
}

// return a random integer number between 0..a exclusive, or a..b exclusive
function rndint(a, b) {
    return rnd(a, b)|0
}

// return a random element from a list
function rnditem(list) {
    return list[rndint(list.length)]
}

// linearly interpolate between a and b, depending on fraction f=0..1 == a..b
function lerp(a, b, f) {
    return a * (1 - f) + b * f
}

// fix a between range of min and max
function clamp(a, min, max) {
    if (a < min) return min
    if (a > max) return max
    return a
}

// take any angle, normalize it between -PI..PI
function anglenorm(a) {
    while (a < -TAU2) a += TAU
    while (a > TAU2) a -= TAU
    return a
}

// take any two angles, return a1 - a2 from -PI..PI
function anglediff(a1, a2) {
    return anglenorm(a1 - a2)
}

// take any angle, and a max angle, clamp angle between -max_angle...max_angle
function angleclamp(a, max) {
    max = anglenorm(max)
    return clamp(anglenorm(a), -max, max)
}

// pythagoras distance without square root
function dist2(x1, x2, y1, y2) {
    return Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)
}

// pythagoras distance
function dist(x1, x2, y1, y2) {
    return Math.sqrt(dist2(x1, x2, y1, y2))
}

// distance between a line and a point without square root
function linePointDist2(lx1, ly1, lx2, ly2, px, py) {
    let l2 = dist2(lx1, lx2, ly1, ly2)
    if (l2 === 0) return dist2(lx1, px, ly1, py)
    let t = ((px - lx1) * (lx2 - lx1) + (py - ly1) * (ly2 - ly1)) / l2
    if (t < 0) return dist2(lx1, px, ly1, py)
    if (t > 1) return dist2(lx2, px, ly2, py)
    return dist2(lx1 + t * (lx2 - lx1), px, ly1 + t * (ly2 - ly1), py)
}

// distance between a line and a point
function linePointDist(lx1, ly1, lx2, ly2, px, py) {
    return Math.sqrt(linePointDist2(lx1, ly1, lx2, ly2, px, py))
}

// check if two rays intersect
function rayIntersect(px1, py1, vx1, vy1, px2, py2, vx2, vy2) {
    let d = -vx2 * vy1 + vx1 * vy2
    let t = (vx2 * (py1 - py2) -  vy2 * (px1 - px2)) / d
    if (t >= 0 && t <= 1) {
        let s = (-vy1 * (px1 - px2) + vx1 * (py1 - py2)) / d
        if (s >= 0 && s <= 1) return true
    }
    return false
}

assert(!rayIntersect(0, 0, 100, 0, 25, 25, 100, 100))
assert(rayIntersect(0, 0, 100, 0, 25, 25, 0, -100))
assert(!rayIntersect(0, 100, 100, 0, 25, 25, 0, -100))
assert(rayIntersect(0, 100, 100, 0, 25, 25, 10, 100))
assert(rnd() >= 0)
assert(rnd(1) >= 0)
assert(rnd(0, 0) === 0)
assert(rnd(-1, 0) < 0)
assert(rnd(-1, 0) >= -1)
assert(rnd(1, 2) >= 1)
assert(rnd(2, 1) >= 1)

if (!Array.prototype.each) Array.prototype.each = Array.prototype.forEach

if (!Array.prototype.equals) {
    Array.prototype.equals = function equals(other) {
        if (this.length !== other.length) return false
        for (var i = 0, il = this.length; i < il; i++) {
            var ti = this[i]
            var oi = other[i]
            if (ti == oi) continue
            if (isArray(ti) && isArray(oi) && ti.equals(oi)) continue
            return false
        }
        return true
    }
}

if (!Array.prototype.sum) {
    Array.prototype.sum = function sum() {
        var sum = 0
        for (var i = 0, il = this.length; i < il; i++) sum += this[i]
        return sum
    }
    assert([1,2,3].sum() == 6)
}

if (!Array.prototype.max) {
    Array.prototype.max = function max() {
        var max = this[0]
        for (var i = 1, il = this.length; i < il; i++) { var e = this[i]; if (e > max) max = e }
        return max
    }
    assert([1,2,3].max() == 3)
}

if (!Array.prototype.min) {
    Array.prototype.min = function min() {
        var min = this[0]
        for (var i = 1, il = this.length; i < il; i++) { var e = this[i]; if (e < min) min = e }
        return min
    }
    assert([1,2,3].min() == 1)
}

if (!Object.forEach) {
    Object.forEach = function forEach(obj, fn) {
        Object.keys(obj).forEach((key, n) => {
            fn(obj[key], key, n)
        })
    }
}
if (!Object.each) Object.each = Object.forEach

if (!Array.prototype.remove) {
    Array.prototype.remove = function remove(item) {
        var at = this.indexOf(item)
        if (at < 0) return null
        this.splice(at, 1)
        return this
    }
    assert([1,2,3,4,3].remove(3).equals([1,2,4,3]))
}

if (!Array.prototype.shuffle) {
    Array.prototype.shuffle = function shuffle() {
        for (var i = 0, il = this.length; i < il; i++) {
            var at = rndint(il - i)
            var tmp = this[i]; this[i] = this[at]; this[at] = tmp // swap
        }
        return this
    }
    var test = [1,2,3,4]
    assert(test.shuffle().length === 4)
    assert(test.shuffle().indexOf(3) >= 0)
    assert(test.shuffle().indexOf(4) >= 0)
}

function stablesortcmp(l, r) { return l > r }

function stablesortpass(buf1, buf2, cmp, chunk, len) {
    var i = 0
    var chunk2 = chunk * 2

    // for all chunks in the list, merge them
    for (var l = 0; l < len; l += chunk2) {
        var r = l + chunk
        var e = r + chunk
        if (r > len) r = len
        if (e > len) e = len
        // now we have the left start, right start, and end

        var li = l
        var ri = r
        while (true) {
            if (li < r && ri < e) {
                var le = buf1[li]
                var re = buf1[ri]
                if (cmp(le, re) <= 0) { buf2[i++] = le; li++ } else { buf2[i++] = re; ri++ }
            } else if (li < r) {
                buf2[i++] = buf1[li++]
            } else if (ri < e) {
                buf2[i++] = buf1[ri++]
            } else {
                break
            }
        }
    }
}

function stablesort(ls, cmp) {
    var len = ls.length
    if (len <= 1) return ls
    if (!cmp) cmp = stablesortcmp
    var buf1 = ls
    var buf2 = new Array(len)
    for (var chunk = 1; chunk < len; chunk *= 2) {
        stablesortpass(buf1, buf2, cmp, chunk, len)
        var tmp = buf1; buf1 = buf2; buf2 = tmp // swap
    }
    if (buf1 !== ls) for (var i = 0; i < len; i++) ls[i] = buf1[i]
    return ls
}

assert(stablesort([2, 1]).equals([1, 2]))
assert(stablesort([3, 1, -200, 2]).equals([-200, 1, 2, 3]))
assert(stablesort([10, 3, 1, -200, 2]).equals([-200, 1, 2, 3, 10]))

if (!Array.prototype.stablesort) {
    Array.prototype.stablesort = function(cmp) { return stablesort(this, cmp) }
}

// nodejs and running with `node [options] lib.js others.js ...` run as browser would do <script> tags
// NOTE: this will not work: --someoption lol.js, workaround with --someoption=lol.js
// TODO timers are broken because something in setTimeout, setInterval is not closing over properly
if (typeof(process) !== "undefined" && process.argv) {
    var fs = null
    var vm = null
    var context = null
    for (var i = 0; i < process.argv.length; i++) {
        var file = process.argv[i]
        if (!file.endsWith(".js")) continue
        if (file.startsWith("-")) continue
        if (!fs) {
            // first file must be lib.js
            if (file !== "lib.js" && !file.endsWith("/lib.js")) break
            fs = require("fs")
            vm = require("vm")
            context = vm.createContext({console, require, setTimeout, clearTimeout, setInterval, clearInterval})
        }
        if (!file.startsWith("/")) file = __dirname +"/"+ file
        //console.log("loading:", file)
        vm.runInContext(fs.readFileSync(file), context, {filename:file})
    }
}

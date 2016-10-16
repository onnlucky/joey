"use strict"
// **** a perhaps conscious robot ****
//depends on libg.js and lib.js
//author: Onne Gorter

// The simplest implementation of how some aspect of the brain might work with
// regard to planning. And how that might lead to some kind of reflection and
// thought and perhaps self awareness. (None of that last sentence are in this
// code.)
//
// How does it work? It keeps a memory of what it sees and what it does. When
// it receives a reward, it will record from memory what lead to that reward.
// This is called a plan. If it sees some state that matches the beginning of a
// plan, it will start following that plan. If that plan leads to reward, the
// plan is promoted. If the plan does not match with what it sees, that leads
// to surprise and the plan is demoted.
//
// The few things that make the robot smarter than just walking random:
// * it grows existing plans step by step after a reward
// * it ignores plans that backtrack
// * it ignores plans that see nothing for too long
// * it discards plans that lead to too much surprise and too little reward
//
// What it does not do:
// * it does not match plans based on multiple steps
// * it does not reevaluate plans at every step
// * it does not have higher level plans, like strategies, instead it either
//   has a plan, or it wanders about
// * it does not receive pain, so no plans to avoid things
// * it does not learn to predict and does not base plans on predicted futures
//
// This is basically a technique related to reinforced learning.
// https://en.wikipedia.org/wiki/Reinforcement_learning

var renderReward = 0
var rewardtimers = []
const WIDTH = 10
const HEIGHT = 10

var field = [
    "          ",
    " XXR      ",
    "       BRB",
    "        B ",
    "          ",
    "          ",
    "  R   B   ",
    "  X   RB  ",
    "  X   B   ",
    "          ",
]
field.each((row, n)=> field[n] = row.split(""))

function look1(x, y) { return field[mod(y, HEIGHT)][mod(x, WIDTH)] }
function look(x, y, dir) {
    switch (dir) {
        case 0: return [look1(x+1, y-1), look1(x+1, y), look1(x+1, y+1)].join("")
        case 1: return [look1(x+1, y+1), look1(x, y+1), look1(x-1, y+1)].join("")
        case 2: return [look1(x-1, y+1), look1(x-1, y), look1(x-1, y-1)].join("")
        case 3: return [look1(x-1, y-1), look1(x, y-1), look1(x+1, y-1)].join("")
    }
}
assert(field.length == HEIGHT)
assert(rnditem(field).length == WIDTH)
assert(look(2, 0, 1) === "RXX")
assert(look(2, 2, 3) === "XXR")

// robot state
var score = 0
var x = 0
var y = 0
var dir = 0
var currentPlan = null
var currentStep = 0

// robot plans and memory
var plans = []
var stateMemory = []
var moveMemory = []

// before moving, record the state the robot sees and the move it is about to make
function record(state, move) {
    stateMemory.unshift(state)
    moveMemory.unshift(move)
    if (stateMemory.length > 20) {
        stateMemory.pop()
        moveMemory.pop()
    }
}

// a plan is a combination of expected states and moves
class Plan {
    constructor() {
        this.states = []
        this.moves = []
        this.weight = 1
    }

    add(state, move) {
        this.states.unshift(state)
        this.moves.unshift(move)
    }

    equals(other) {
        if (this.states.length != other.states.length) return false
        for (var i = 0, il = this.states.length; i < il; i++) {
            if (this.states[i] != other.states[i]) return false
            if (this.moves[i] != other.moves[i]) return false
        }
        return true
    }
}

// add only unique plans, returns if true if plan was actually added
function addPlan(plan) {
    for (var i = 0, il = plans.length; i < il; i++) {
        if (plans[i].equals(plan)) return false
    }
    plans.push(plan)
    return true
}

// clear robot memory, simplifies logic a lot
function clearMemory() {
    stateMemory.length = 0
    moveMemory.length = 0
}

// the robot found a reward, if from a plan up its weight, also try to form a new plan from memory
function receiveReward(plan) {
    renderReward = 1
    if (plan) plan.weight += 0.5

    var plan = new Plan()
    var empty = 0
    var rot = 0
    for (var i = 0, il = stateMemory.length; i < il; i++) {
        var move = moveMemory[i]
        if (move === 2) {
            rot = 0
        } else {
            // if a plan backtracks on itself, don't record it
            if (move === 0) rot -= 1
            if (move === 1) rot += 1
            if (rot == 0 || rot == 2 || rot == -2) return
        }
        plan.add(stateMemory[i], move)
        // if a plan starts at an empty state, or has too many empties, don't record it
        if (stateMemory[i] === "   ") {
            if (empty >= 1) return
            empty += 1
            continue
        }
        empty = 0
        if (addPlan(plan)) break
    }

    clearMemory()
}

// if a plan fails, the robot is surprised, and demotes the plan, when a plan is too useless it is deleted
function receiveSurprise(plan) {
    plan.weight -= 0.1
    if (plan.weight <= 0) plans.remove(plan)
}

// match current state to any plan and pick a plan, preferably a high weight plan
function findPlan(state) {
    var candidates = []
    for (var i = 0, il = plans.length; i < il; i++) {
        var plan = plans[i]
        if (plan.states[0] === state) candidates.push(plan)
    }
    if (candidates.length === 0) return null

    // draw a number between 0..SUM(weight) of candidate plans, and map that number to a plan
    // this is how we favor high weight plans over low weight plans
    var sum = candidates.map(p => p.weight).sum()
    var p = rnd(sum)
    for (var i = 0, il = candidates.length; i < il; i++) {
        var plan = candidates[i]
        p -= plan.weight
        if (p <= 0) return plan
    }
    assert(false)
}

// think about the next move, look, evaluate plan, get a new plan, and actually do the move
function think() {
    var state = look(x, y, dir)
    var move = -1

    // if we have a plan, see if the next step matches current state, or we are surprised
    if (currentPlan) {
        var expect = currentPlan.states[currentStep]
        if (state === expect) {
            move = currentPlan.moves[currentStep]
            currentStep += 1
        } else {
            receiveSurprise(currentPlan)
            currentPlan = null
        }
    }

    // if we have no plan, see if we can think up a plan
    if (!currentPlan) {
        currentPlan = findPlan(state)
        if (currentPlan) {
            move = currentPlan.moves[0]
            currentStep = 1
        }
    }

    // if we still have no move, move randomly
    if (move < 0) move = rndint(3)

    // record the move
    record(state, move)

    return move
}

// move the robot according to current x,y,dir the choosen move
function move(move) {
    if (move == 0) {
        dir = mod(dir - 1, 4)
    } else if (move == 1) {
        dir = mod(dir + 1, 4)
    } else {
        var nx = x, ny = y
        /**/ if (dir == 0) nx = mod(x + 1, WIDTH)
        else if (dir == 1) ny = mod(y + 1, HEIGHT)
        else if (dir == 2) nx = mod(x - 1, WIDTH)
        else if (dir == 3) ny = mod(y - 1, HEIGHT)

        assert(nx >= 0 && nx < WIDTH)
        assert(ny >= 0 && ny < HEIGHT)
        var c = field[ny][nx]

        // if we move into a wall, no movement
        if (c != " " && c != "R") return

        // move to new new position, and check if we found a reward
        x = nx; y = ny
        if (c == "R") {
            score += 1
            // reset the field and start a timer
            field[y][x] = " "
            rewardtimers.push({time:rndint(20, 80), x, y})

            // reward currentPlan and discard it
            receiveReward(currentPlan)
            currentPlan = null
        }
    }
}

var rewardtimers = []
function step() {
    // check if any rewards need to be added back to the field
    for (var i = 0, il = rewardtimers.length; i < il; i++) {
        var timer = rewardtimers[i]
        timer.time -= 1
        if (timer.time > 0) continue
        rewardtimers.splice(i, 1); i -= 1; il -= 1
        field[timer.y][timer.x] = "R"
    }

    // let the robot think and then move
    move(think())
}

// render field and robot and plans and score to a canvas
function draw(g) {
    g.rect(0, 0, WIDTH * 10, HEIGHT * 10)
    g.fillStyle = "#DDD"
    g.fill()

    // render feel good reward
    if (renderReward > 0) {
        g.globalAlpha = renderReward * 0.75
        renderReward -= 0.2
        g.fillStyle = "green"
        g.fill()
        g.globalAlpha = 1
    }

    // render the field
    for (let x = 0; x < WIDTH; x++) {
        for (let y = 0; y < HEIGHT; y++) {
            switch (field[y][x]) {
                case "X": g.fillStyle = "#017"; break
                case "R": g.fillStyle = "yellow"; break
                case "B": g.fillStyle = "#051"; break
                default: continue
            }
            g.beginPath()
            g.rect(x * 10, y * 10, 10, 10)
            g.fill()
        }
    }

    // render the robot
    g.beginPath()
    g.fillStyle = "red"
    g.rect(x * 10, y * 10, 10, 10)
    g.fill()

    // with a little line showing direction
    let dx = 0
    let dy = 0
    switch (dir) {
        case 0: dx = 1; break
        case 1: dy = 1; break
        case 2: dx = -1; break
        case 3: dy = -1; break
    }
    g.beginPath()
    g.moveTo(x * 10 + 5, y * 10 + 5)
    g.lineTo((x + dx) * 10 + 5, (y + dy) * 10 + 5)
    g.strokeStyle = "black"
    g.stroke()

    // render the plan, if any
    if (currentPlan) {
        var fx = x
        var fy = y
        var fdir = dir
        for (var i = currentStep; i < currentPlan.moves.length; i++) {
            var move = currentPlan.moves[i]
            if (move == 0) {
                fdir = mod(fdir - 1, 4)
            } else if (move == 1) {
                fdir = mod(fdir + 1, 4)
            } else {
                /**/ if (fdir == 0) fx = mod(fx + 1, WIDTH)
                else if (fdir == 1) fy = mod(fy + 1, HEIGHT)
                else if (fdir == 2) fx = mod(fx - 1, WIDTH)
                else if (fdir == 3) fy = mod(fy - 1, HEIGHT)
            }
            g.fillStyle = "green"
            g.beginPath()
            g.rect(fx * 10 + 2.5, fy * 10 + 2.5, 5, 5)
            g.fill()
        }

        // plan in steps
        g.font = "14px Arial"
        var w = WIDTH * 10 + 15
        var h = 14
        for (var j = 0; j < currentPlan.moves.length; j++) {
            var state = currentPlan.states[j]
            var move = currentPlan.moves[j]
            for (var i = 0; i < state.length; i++) {
                switch (state[i]) {
                    case "X": g.fillStyle = "#017"; break
                    case "R": g.fillStyle = "yellow"; break
                    case "B": g.fillStyle = "#051"; break
                    default: g.fillStyle = "white"; break
                }
                g.beginPath()
                g.rect(w + i * 10, h + j * 12, 10, 10)
                g.fill()
            }
            g.beginPath()
            g.strokeStyle = "black"
            if (currentStep == j) g.strokeStyle = "red"
            g.rect(w, h + j * 12, 30, 10)
            g.stroke()

            var s = "."
            if (move == 0) s = "<"
            if (move == 1) s = ">"
            g.fillStyle = "black"
            if (currentStep == j) g.fillStyle = "red"
            g.fillText(s, w + 33, h + j * 12 + 10)
        }
    }

    // status text
    var v = WIDTH * 10 + 70
    g.fillStyle = "black"
    g.font = "14px Arial"
    g.fillText((currentPlan?"plan":"wander"), WIDTH * 10 + 15, 10)
    g.fillText("score: "+ score, v, 24)
    g.fillText("eyes:", v, 44)
    var w = g.measureText("eyes:").width
    g.fillText("plans: " + plans.length, v, 64)
    var s = "fast"
    if (speed <= 2) s = "normal"
    if (speed == 1 || speed == 3) s += " (slow plan)"
    if (speed == 0) s = "stop"
    g.fillText("speed: "+ s, v, 84)

    // render what the robot sees
    var state = look(x, y, dir)
    for (var i = 0; i < state.length; i++) {
        switch (state[i]) {
            case "X": g.fillStyle = "#017"; break
            case "R": g.fillStyle = "yellow"; break
            case "B": g.fillStyle = "#051"; break
            default: g.fillStyle = "white"; break
        }
        g.beginPath()
        g.rect(v + 6 + w + i * 10, 34, 10, 11)
        g.fill()
    }
    g.beginPath()
    g.strokeStyle = "black"
    g.rect(v + 6 + w, 34, 30, 11)
    g.stroke()
}

// clicking changes speed
function ondown() {
    speed -= 1
    if (speed < 0) speed = 4
}

// quick and easy canvas graphics lib ;)
var scene = createScene(350, HEIGHT * 10, "conscious")
scene.root.setDelegate({draw, ondown})

var speed = 3
var last = currentTime()
var lastplan = false
function tick() {
    var now = currentTime()
    var dt = now - last

    // see if we actually wish to step and draw, depends on speed
    if (speed <= 2) {
        if (dt < 0.1) return
    }
    if ((speed == 1 || speed == 3) && (currentPlan || lastplan)) {
        lastplan = true // make sure the step after a plan is also slowed down
        if (dt < 0.5) return
    }
    if (!currentPlan) lastplan = false

    last = now
    if (speed == 0) return
    step()
    scene.schedule()
}
every(0.01, tick)


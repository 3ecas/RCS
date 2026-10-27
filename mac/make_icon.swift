// Draws the app icon and writes a PNG. Usage: swift make_icon.swift out.png
import Cocoa

let size: CGFloat = 1024
let img = NSImage(size: NSSize(width: size, height: size))
img.lockFocus()
let ctx = NSGraphicsContext.current!.cgContext

// Rounded background with a dusk gradient
let bg = NSBezierPath(roundedRect: NSRect(x: 100, y: 100, width: 824, height: 824), xRadius: 180, yRadius: 180)
bg.addClip()
NSGradient(colors: [NSColor(red: 0.12, green: 0.08, blue: 0.25, alpha: 1),
                    NSColor(red: 0.30, green: 0.18, blue: 0.45, alpha: 1)])!.draw(in: bg, angle: 90)

// Tower walls
for side in [0, 1] {
    let x: CGFloat = side == 0 ? 100 : 824
    NSColor(red: 0.33, green: 0.27, blue: 0.27, alpha: 1).setFill()
    NSRect(x: x, y: 100, width: 100, height: 824).fill()
    NSColor(red: 0.22, green: 0.18, blue: 0.2, alpha: 1).setFill()
    var y: CGFloat = 100
    while y < 924 { NSRect(x: x, y: y, width: 100, height: 6).fill(); y += 60 }
}

// Platforms
func platform(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ c: NSColor) {
    c.setFill(); NSBezierPath(roundedRect: NSRect(x: x, y: y, width: w, height: 40), xRadius: 8, yRadius: 8).fill()
    NSColor(white: 1, alpha: 0.35).setFill(); NSRect(x: x + 4, y: y + 28, width: w - 8, height: 10).fill()
}
platform(250, 230, 300, NSColor(red: 0.55, green: 0.48, blue: 0.42, alpha: 1))
platform(520, 470, 230, NSColor(red: 0.35, green: 0.5, blue: 0.7, alpha: 1))
platform(250, 690, 240, NSColor(red: 0.55, green: 0.48, blue: 0.42, alpha: 1))

// Two blob players
func blob(_ x: CGFloat, _ y: CGFloat, _ c: NSColor, _ d: NSColor) {
    d.setFill(); NSBezierPath(roundedRect: NSRect(x: x - 8, y: y - 8, width: 136, height: 176), xRadius: 40, yRadius: 40).fill()
    c.setFill(); NSBezierPath(roundedRect: NSRect(x: x, y: y, width: 120, height: 160), xRadius: 34, yRadius: 34).fill()
    NSColor.white.setFill()
    NSBezierPath(ovalIn: NSRect(x: x + 28, y: y + 80, width: 30, height: 44)).fill()
    NSBezierPath(ovalIn: NSRect(x: x + 70, y: y + 80, width: 30, height: 44)).fill()
    NSColor.black.setFill()
    NSBezierPath(ovalIn: NSRect(x: x + 40, y: y + 92, width: 16, height: 16)).fill()
    NSBezierPath(ovalIn: NSRect(x: x + 82, y: y + 92, width: 16, height: 16)).fill()
}
blob(300, 278, NSColor(red: 1, green: 0.36, blue: 0.45, alpha: 1), NSColor(red: 0.72, green: 0.19, blue: 0.29, alpha: 1))
blob(580, 518, NSColor(red: 0.3, green: 0.79, blue: 0.94, alpha: 1), NSColor(red: 0.12, green: 0.5, blue: 0.65, alpha: 1))

// Flame on top platform
let flame = NSBezierPath()
flame.move(to: NSPoint(x: 400, y: 730))
flame.curve(to: NSPoint(x: 430, y: 860), controlPoint1: NSPoint(x: 380, y: 800), controlPoint2: NSPoint(x: 420, y: 820))
flame.curve(to: NSPoint(x: 460, y: 730), controlPoint1: NSPoint(x: 450, y: 820), controlPoint2: NSPoint(x: 480, y: 790))
flame.close()
NSGradient(colors: [NSColor(red: 1, green: 0.95, blue: 0.6, alpha: 1), NSColor(red: 1, green: 0.4, blue: 0, alpha: 1)])!.draw(in: flame, angle: 90)
_ = ctx
img.unlockFocus()

let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))

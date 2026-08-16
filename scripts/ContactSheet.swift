// Build a labelled contact sheet from a video so the whole take can be judged
// in one look instead of opening frames one at a time.
//
//   swift ContactSheet.swift <input.mov> <out.png> <cols> <rows>

import AVFoundation
import CoreGraphics
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
let inputURL = URL(fileURLWithPath: args[1])
let outPath = args[2]
let cols = Int(args[3]) ?? 6
let rows = Int(args[4]) ?? 4
let total = cols * rows

let asset = AVURLAsset(url: inputURL)
guard let track = asset.tracks(withMediaType: .video).first,
      let reader = try? AVAssetReader(asset: asset) else { exit(1) }

let output = AVAssetReaderTrackOutput(
    track: track,
    outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
reader.add(output)
reader.startReading()

func makeImage(_ buffer: CVPixelBuffer) -> CGImage? {
    CVPixelBufferLockBaseAddress(buffer, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(buffer, .readOnly) }
    guard let base = CVPixelBufferGetBaseAddress(buffer) else { return nil }
    guard let ctx = CGContext(
        data: base,
        width: CVPixelBufferGetWidth(buffer),
        height: CVPixelBufferGetHeight(buffer),
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue
            | CGBitmapInfo.byteOrder32Little.rawValue) else { return nil }
    return ctx.makeImage()
}

var frames: [CGImage] = []
while let sample = output.copyNextSampleBuffer() {
    guard let buffer = CMSampleBufferGetImageBuffer(sample) else { continue }
    if let cg = makeImage(buffer) { frames.append(cg) }
}
print("decoded \(frames.count) frames")
guard !frames.isEmpty else { exit(1) }

let cell = 190
let label = 22
let sheetW = cols * cell
let sheetH = rows * (cell + label)

guard let sheet = CGContext(
    data: nil, width: sheetW, height: sheetH,
    bitsPerComponent: 8, bytesPerRow: 0,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }

// Mid grey so a transparent Memoji is visible against it.
sheet.setFillColor(CGColor(red: 0.42, green: 0.44, blue: 0.48, alpha: 1))
sheet.fill(CGRect(x: 0, y: 0, width: sheetW, height: sheetH))

let font = CTFontCreateWithName("Menlo" as CFString, 13, nil)

// Optional frame range, so a specific arc can be inspected closely.
let startF = args.count > 5 ? (Int(args[5]) ?? 0) : 0
let endF = args.count > 6 ? (Int(args[6]) ?? frames.count - 1) : frames.count - 1

for i in 0..<total {
    let pos = Double(i) / Double(total - 1)
    let idx = min(frames.count - 1, startF + Int(pos * Double(endF - startF)))
    let img = frames[idx]

    let col = i % cols
    let row = i / cols
    let x = col * cell
    // CoreGraphics origin is bottom-left; lay rows out top-down.
    let y = sheetH - (row + 1) * (cell + label)

    sheet.draw(img, in: CGRect(x: x, y: y + label, width: cell, height: cell))

    let text = "\(i): f\(idx)"
    // CoreText attribute keys — the AppKit `.font` / `.foregroundColor`
    // shorthands are not available without importing AppKit.
    let attr = NSAttributedString(
        string: text,
        attributes: [
            NSAttributedString.Key(kCTFontAttributeName as String): font,
            NSAttributedString.Key(kCTForegroundColorAttributeName as String):
                CGColor(red: 1, green: 1, blue: 1, alpha: 1),
        ])
    let line = CTLineCreateWithAttributedString(attr)
    sheet.textPosition = CGPoint(x: CGFloat(x) + 6, y: CGFloat(y) + 5)
    CTLineDraw(line, sheet)
}

guard let outImg = sheet.makeImage(),
      let dest = CGImageDestinationCreateWithURL(
        URL(fileURLWithPath: outPath) as CFURL,
        UTType.png.identifier as CFString, 1, nil) else { exit(1) }
CGImageDestinationAddImage(dest, outImg, nil)
CGImageDestinationFinalize(dest)
print("wrote \(outPath)")

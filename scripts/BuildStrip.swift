// Build the avatar turn strip from a Memoji recording.
//
// Takes an explicit, spatially ordered list of source frame numbers (leftmost
// gaze first) and writes turn-00…turn-NN.png.
//
// Each frame is cropped around its own alpha bounding box and re-centred on a
// common box size. A live Memoji recording drifts around the canvas, and
// without that stabilisation the head visibly jumps as the cursor swaps frames.
//
//   swift BuildStrip.swift <input.mov> <outdir> <size> <f0,f1,f2,...>

import AVFoundation
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count >= 5 else {
    FileHandle.standardError.write("usage: BuildStrip <in> <outdir> <size> <frames,csv>\n".data(using: .utf8)!)
    exit(1)
}
let inputURL = URL(fileURLWithPath: args[1])
let outDir = args[2]
let outSize = Int(args[3]) ?? 336
let picks = args[4].split(separator: ",").compactMap { Int($0) }

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

/// Bounding box of pixels above a small alpha threshold.
func alphaBounds(_ img: CGImage) -> CGRect? {
    let w = img.width, h = img.height
    var buf = [UInt8](repeating: 0, count: w * h * 4)
    guard let ctx = CGContext(
        data: &buf, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
    ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))

    var minX = w, minY = h, maxX = -1, maxY = -1
    for y in 0..<h {
        for x in 0..<w where buf[(y * w + x) * 4 + 3] > 24 {
            if x < minX { minX = x }
            if x > maxX { maxX = x }
            if y < minY { minY = y }
            if y > maxY { maxY = y }
        }
    }
    guard maxX >= minX, maxY >= minY else { return nil }
    return CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)
}

// Pass 1: measure every pick so one crop size covers the widest pose.
var boxes: [(CGImage, CGRect)] = []
for f in picks {
    let idx = max(0, min(frames.count - 1, f))
    let img = frames[idx]
    guard let b = alphaBounds(img) else { continue }
    boxes.append((img, b))
}
let maxExtent = boxes.map { max($0.1.width, $0.1.height) }.max() ?? 300
let crop = maxExtent * 1.18   // headroom so no pose clips at the edge
print("crop box \(Int(crop))px -> \(outSize)px")

try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

for (i, entry) in boxes.enumerated() {
    let (img, box) = entry
    let cx = box.midX, cy = box.midY

    guard let ctx = CGContext(
        data: nil, width: outSize, height: outSize, bitsPerComponent: 8, bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { continue }
    ctx.interpolationQuality = .high
    ctx.clear(CGRect(x: 0, y: 0, width: outSize, height: outSize))

    // Draw the source so the bbox centre lands at the centre of the output.
    let scale = Double(outSize) / crop
    let drawW = Double(img.width) * scale
    let drawH = Double(img.height) * scale
    let originX = Double(outSize) / 2 - cx * scale
    // CGImage draws bottom-up; flip the centre into that space.
    let flippedCY = Double(img.height) - cy
    let originY = Double(outSize) / 2 - flippedCY * scale

    ctx.draw(img, in: CGRect(x: originX, y: originY, width: drawW, height: drawH))

    guard let out = ctx.makeImage() else { continue }
    let name = String(format: "%@/turn-%02d.png", outDir, i)
    guard let dest = CGImageDestinationCreateWithURL(
        URL(fileURLWithPath: name) as CFURL,
        UTType.png.identifier as CFString, 1, nil) else { continue }
    CGImageDestinationAddImage(dest, out, nil)
    CGImageDestinationFinalize(dest)
    print("  turn-\(String(format: "%02d", i)).png  <- source frame \(picks[i])")
}

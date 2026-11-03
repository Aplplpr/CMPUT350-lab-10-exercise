#version 120 

// (way more precision than a float can actually store...)
#define LOG_2 0.6931471805599453094172321214581765680755001

// start using these antialiasing values once you start (c)
#define AA 2
const int TOTAL_SAMPLES = AA * AA;

uniform vec2 c;
uniform int MAX_ITERS;
uniform vec2 windowSizePixels;
uniform vec2 camCenterWorld;
uniform float camWorldUnitsPerPixel;


uniform vec2 oldCamCenterWorld;
uniform float oldCamWorldUnitsPerPixel;
uniform sampler2D oldFrame;
uniform int hasOldFrame;
uniform int cChanged;
uniform int TRUE_MAX_ITERS;


// reprojection (1d) may require extra uniforms here...

// Use this to get a color from your smoothed Julia set escape times.
vec4 colorTime(float t) {
    return vec4(0.5 + 0.5 * cos(  0.1 * (t) + vec3(0.f, 0.35, 0.7)), 1.f);
}

struct EscapeTime {
    float iters;
    bool isInf;
};

// Escape time of iterating z^2 + c
EscapeTime escapeTimeSmooth(vec2 z) {
    // TODO
    for (int i = 0; i < MAX_ITERS; i++) {
        if (length(z) > 4.0) {
            float t = float(i) + 1.0
                - log(log(length(z))) / LOG_2;

            return EscapeTime(t, false);
        }

        z = vec2(
            z.x * z.x - z.y * z.y + c.x,
            2.0 * z.x * z.y + c.y
        );
    }

    return EscapeTime(0.0, true);
}


vec2 windowToWorld(vec2 windowCoords) {
    // TODO
    vec2 offset = windowCoords - windowSizePixels / 2.0;
    return camCenterWorld + offset * camWorldUnitsPerPixel;
}

// For reprojection
vec2 worldToOldWindow(vec2 worldCoords) {
    // TODO
    vec2 offset = worldCoords - oldCamCenterWorld;
    return offset / oldCamWorldUnitsPerPixel + windowSizePixels / 2.0;
}

// For SSAA
// Given (dx, dy) in [0, AA)^2, suppose the unit square [0, 1)^2 was cut up into AA equal
// partitions along each dimension. delta((dx, dy)) returns the center of the sub-square
// which is in the dy'th row and dx'th column (both 0-indexed).
vec2 delta(vec2 dxy) {
    // TODO
    return (dxy + vec2(0.5, 0.5)) / float(AA);
}

void main() {
    //TODO
    vec4 totalColor = vec4(0.0, 0.0, 0.0, 0.0);
    for (int x = 0; x < AA; x++) {
        for (int y = 0; y < AA; y++) {

            // Task 2: subpixel position
            vec2 subpixel = delta(vec2(float(x), float(y)));
            vec2 windowPos = gl_FragCoord.xy - vec2(0.5, 0.5) + subpixel;
            vec2 worldPos = windowToWorld(windowPos);

            EscapeTime result = escapeTimeSmooth(worldPos);

            vec4 newColor;
            if (result.isInf) {
                newColor = vec4(0.0, 0.0, 0.0, 1.0);
            } else {
                newColor = colorTime(result.iters);
            }

            vec4 finalColor = newColor;

            // Task 3: reprojection
            if (hasOldFrame == 1 && cChanged == 0) {
                vec2 oldWindow = worldToOldWindow(worldPos);

                if (oldWindow.x >= 0.0 &&
                    oldWindow.x < windowSizePixels.x &&
                    oldWindow.y >= 0.0 &&
                    oldWindow.y < windowSizePixels.y) {

                    vec2 oldUV = oldWindow / windowSizePixels;
                    vec4 oldColor = texture2D(oldFrame, oldUV);

                    float iterationCount = result.iters;
                    if (result.isInf) {
                        iterationCount = float(MAX_ITERS);
                    }

                    float alpha = min(
                        iterationCount / float(TRUE_MAX_ITERS),
                        1.0
                    );

                    finalColor = (1.0 - alpha) * oldColor
                               + alpha * newColor;
                }
            }

            totalColor += finalColor;
        }
    }

    gl_FragColor = totalColor / float(TOTAL_SAMPLES);
}

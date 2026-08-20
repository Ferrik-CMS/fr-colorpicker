/**
 * Shared 3x3 matrix math and color-space matrices for OKLCH conversions.
 *
 * Used by `oklchColor.ts` (parse/format/gamut).
 */

export type Mat3 = [[number, number, number], [number, number, number], [number, number, number]];

export function multiplyMat3(a: Mat3, b: Mat3): Mat3 {
	const r: number[][] = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
	];
	for (let i = 0; i < 3; i++) {
		for (let j = 0; j < 3; j++) {
			r[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
		}
	}
	return r as Mat3;
}

export function applyMat3(m: Mat3, v: [number, number, number]): [number, number, number] {
	return [
		m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
		m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
		m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
	];
}

/** OKLab [L, a, b] -> nonlinear LMS' [l_, m_, s_] (still needs cubing to reach linear LMS). */
export const OKLAB_TO_LMS_PRIME: Mat3 = [
	[1, 0.3963377774, 0.2158037573],
	[1, -0.1055613458, -0.0638541728],
	[1, -0.0894841775, -1.291485548],
];

// Linear LMS -> XYZ (D65). Internal - only used to derive LMS_TO_LINEAR_P3 below.
const LMS_TO_XYZ: Mat3 = [
	[1.2270138511, -0.5577999807, 0.281256149],
	[-0.0405801784, 1.1122568696, -0.0716766787],
	[-0.0763812845, -0.4214819784, 1.5861632204],
];

// XYZ (D65) -> linear Display P3. Internal - only used to derive LMS_TO_LINEAR_P3 below.
const XYZ_TO_LINEAR_P3: Mat3 = [
	[2.4934969119, -0.9313836179, -0.4027107845],
	[-0.8294889696, 1.7626640603, 0.0236246858],
	[0.0358458302, -0.0761723893, 0.956884524],
];

/**
 * Linear LMS -> linear sRGB. Kept as Björn Ottosson's published high-precision
 * direct constants rather than composed from LMS_TO_XYZ/XYZ_TO_LINEAR_SRGB -
 * composing loses precision (~8e-4 max abs error vs. these values).
 */
export const LMS_TO_LINEAR_SRGB: Mat3 = [
	[4.0767416621, -3.3077115913, 0.2309699292],
	[-1.2684380046, 2.6097574011, -0.3413193965],
	[-0.0041960863, -0.7034186147, 1.707614701],
];

/** Linear LMS -> linear Display P3, composed once at module load. */
export const LMS_TO_LINEAR_P3: Mat3 = multiplyMat3(XYZ_TO_LINEAR_P3, LMS_TO_XYZ);

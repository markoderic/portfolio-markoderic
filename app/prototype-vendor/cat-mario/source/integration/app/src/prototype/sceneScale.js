// One scene unit = 11.5 cm: 3.12-unit laptop is ~36 cm wide.
export const FLOOR_Y = -6.3;
export const DESK = { width: 10.8, depth: 6, top: 0, thickness: .22 };
export const PRINTER = { position: [-3.65, .02, -.65], rotation: .13, scale: 2.1,
  slotZ: .475, sheetY: .202, slotWidth: 1.1 };
// Chair front is local -Z (toward the desk); +X pitch reclines its back toward +Z.
export const CHAIR = {
  position: [.25, FLOOR_Y, 4.95], yaw: -.2,
  seatWidth: 3.5, seatDepth: 3.25, seatHeight: 3.90, seatThickness: .46,
  panWidth: 3.16, panDepth: 2.96, panHeight: 3.64,
  backWidth: 3.1, backHeight: 2.75, backThickness: .46,
  backPosition: [0, 4.23, 1.32], backTilt: .105,
  armX: 1.84, armHeight: 5.42, armDepth: 1.5,
  baseRadius: 1.86, casterRadius: .19, casterWidth: .28,
};

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faArrowLeft,
  faPlus,
  faXmark,
  faMagnifyingGlass,
  faLeaf,
  faChartSimple,
  faBookOpen,
  faBoxesStacked,
  faArrowRightFromBracket,
  faSliders,
  faCheck,
  faTriangleExclamation,
  faPen,
  faTrash,
  faUtensils,
  faClock,
  faBars,
  faArrowUpRightFromSquare,
  faSpinner,
  faDownload,
  faImage,
  faChevronRight,
  faCircleCheck,
  faSeedling,
  faWheatAwn,
} from "@fortawesome/free-solid-svg-icons";

const icons = {
  arrow: faArrowRight,
  back: faArrowLeft,
  plus: faPlus,
  close: faXmark,
  search: faMagnifyingGlass,
  leaf: faLeaf,
  dashboard: faChartSimple,
  recipes: faBookOpen,
  products: faBoxesStacked,
  logout: faArrowRightFromBracket,
  settings: faSliders,
  check: faCheck,
  warning: faTriangleExclamation,
  edit: faPen,
  trash: faTrash,
  cook: faUtensils,
  clock: faClock,
  menu: faBars,
  external: faArrowUpRightFromSquare,
  loading: faSpinner,
  download: faDownload,
  image: faImage,
  chevron: faChevronRight,
  success: faCircleCheck,
  seed: faSeedling,
  wheat: faWheatAwn,
};

const Icon = ({ name, ...props }) => (
  <FontAwesomeIcon icon={icons[name] || faLeaf} {...props} />
);

export { Icon };

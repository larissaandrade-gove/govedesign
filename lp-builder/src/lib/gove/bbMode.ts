import { createContext, useContext } from "react";

/** A página em edição usa a identidade BB? (lido pelos campos de cor do painel). */
export const BBMode = createContext(false);
export const useBBMode = () => useContext(BBMode);

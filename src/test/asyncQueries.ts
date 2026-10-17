import { configure } from '@testing-library/react';

// Route changes load round data before rendering. Allow headroom when the full
// suite runs under load; queries still finish immediately when content appears.
// Import only in page suites so component and domain tests keep their defaults.
configure({ asyncUtilTimeout: 3000 });
